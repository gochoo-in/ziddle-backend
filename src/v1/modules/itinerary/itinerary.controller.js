import StatusCodes from 'http-status-codes';
import { generateItinerary } from '../../services/gpt.js';
import { addDatesToItinerary } from '../../../utils/dateUtils.js';
import { settransformItinerary } from '../../../utils/transformItinerary.js';
import { addFlightDetailsToItinerary } from '../../services/flightdetails.js';
import { addTransferActivity } from '../../../utils/travelItinerary.js';
import { createLeisureActivityIfNotExist } from '../../../utils/activityUtils.js';
import httpFormatter from '../../../utils/formatter.js';
import Destination from '../../models/destination.js';
import City from '../../models/city.js';
import Activity from '../../models/activity.js';
import Itinerary from '../../models/itinerary.js';
import ItineraryVersion from '../../models/itineraryVersion.js';
import { addHotelDetailsToItinerary } from '../../services/hotelDetails.js';
import { addTaxiDetailsToItinerary } from '../../services/taxiDetails.js';
import { addFerryDetailsToItinerary } from '../../../utils/dummyData.js'
import logger from '../../../config/logger.js';
import GptActivity from '../../models/gptactivity.js';
import Flight from '../../models/flight.js';
import Hotel from '../../models/hotel.js';
import Taxi from '../../models/taxi.js'
import { addDaysToCityService } from '../../services/itineraryService.js'
import { refetchFlightAndHotelDetails, deleteDaysFromCityService } from '../../services/itineraryService.js';
import Lead from '../../models/lead.js';
import { getAdminsWithAccess, checkOwnershipOrAdminAccess } from '../../../utils/casbinService.js';
import Ferry from '../../models/ferry.js';
import mongoose from 'mongoose'
import Employee from '../../models/employee.js';
import User from '../../models/user.js';
import { generateTransportDetails } from '../../services/gptTransfer.js';
import { calculateTotalPriceMiddleware } from '../../../utils/calculateCostMiddleware.js';
import Settings from '../../models/settings.js'
import axios from 'axios';
import Discount from '../../models/discount.js'; 
import { applyDiscountFunction } from '../discount/discount.controller.js';


export const createItinerary = async (req, res) => {
  try {
    var userId = req.user?.userId;
    if (!userId) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(httpFormatter({}, 'User ID is missing from the request.', false));
    }

    const {
      startDate,
      rooms,
      departureCity,
      arrivalCity,
      countryId,
      cities,
      activities,
      tripDuration,
      travellingWith,
      chooseBestForMe
    } = req.body;

    // Check for required fields
    if (
      !startDate ||
      !countryId ||
      !departureCity ||
      !arrivalCity ||
      !rooms ||
      !travellingWith 
    ) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(
          httpFormatter(
            {},
            'Missing or incorrect required fields in request body.',
            false
          )
        );
    }

    // Calculate total adults, children, and collect childrenAges from rooms array
    let adults = 0;
    let children = 0;
    let childrenAges = [];

    rooms.forEach((room) => {
      adults += room.adults || 0;
      children += room.children || 0;
      if (room.childrenAges && Array.isArray(room.childrenAges)) {
        childrenAges = childrenAges.concat(room.childrenAges);
      }
    });

    // Calculate total persons (adults + children)
    const totalPersons = adults + children;

    // Find the country (destination)
    const country = await Destination.findById(countryId);
    if (!country) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(httpFormatter({}, 'Invalid country ID.', false));
    }

    const discount = await Discount.findOne({
      destination: countryId,
      discountType: 'couponless' 
    }).sort({ createdAt: -1 });
    
    // Ensure `cities` is always an array
    const cityIds = Array.isArray(cities) ? cities : [cities];

    // Find city and activity details
    const cityDetails = await City.find({ _id: { $in: cityIds } });
    let selectedActivities = activities;
    if (chooseBestForMe) {
      const featuredActivities = await Activity.find({
        city: { $in: cityIds },
        featured: true
      }).select('_id');

      selectedActivities = featuredActivities.map(activity => activity._id);
    }
    const activityDetails = await Activity.find({ _id: { $in: selectedActivities } });

    if (!cityDetails.length) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(httpFormatter({}, 'One or more cities are invalid.', false));
    }

    // Generate itinerary
    const result = await generateItinerary({
      ...req.body,
      country: country.name,
      cities: cityDetails.map((city) => ({
        name: city.name,
        iataCode: city.iataCode,
        activities: activityDetails
          .filter(
            (activity) => activity.city?.toString() === city._id?.toString()
          )
          .map((activity) => ({
            name: activity.name,
            duration: activity.duration,
            category: activity.category,
            opensAt: activity.opensAt,
            closesAt: activity.closesAt,
          })),
      })),
    });

    // Process itinerary details with travel and dates
    let itineraryWithTitles = {
      title: result.title,
      subtitle: result.subtitle,
      destination: country.name,
      itinerary: result.itinerary,
    };

    // If there's more than one city, add transfer activities
    // if (cityDetails.length > 1) {
      itineraryWithTitles = addTransferActivity(itineraryWithTitles);
    //}

    // Add leisure activities if needed based on trip duration
    const [minTripDuration] = tripDuration.split('-').map(Number);
    let totalPlannedDays = itineraryWithTitles.itinerary.reduce(
      (acc, city) => acc + city.days.length,
      0
    );
    let remainingDays = minTripDuration - totalPlannedDays;

    if (remainingDays > 0) {
      const citiesCount = itineraryWithTitles.itinerary.length;
      let cityIndex = 0;

      while (remainingDays > 0) {
        const currentCity = itineraryWithTitles.itinerary[cityIndex];
        const cityId = cityDetails.find(
          (c) => c.name === currentCity.currentCity
        )?._id;

        if (cityId) {
          const leisureActivity = await GptActivity.create({
            name: 'Leisure',
            startTime: '10:00 AM',
            endTime: '5:00 PM',
            duration: '7 hours',
            timeStamp: 'All day',
            category: 'Leisure',
            cityId: cityId,
          });

          logger.info(`Leisure Activity Created: ${JSON.stringify(leisureActivity)}`);

          const newDayIndex = currentCity.days.length + 1;

          currentCity.days.push({
            day: newDayIndex,
            date: '', // Date will be set later
            activities: [leisureActivity], // Store ObjectId
          });

          totalPlannedDays++;
          remainingDays--;
        }

        cityIndex = (cityIndex + 1) % citiesCount; // Rotate between cities
      }
    }

    // Add dates to itinerary after all activities have been added
    itineraryWithTitles = addDatesToItinerary(itineraryWithTitles, startDate);
    itineraryWithTitles = settransformItinerary(itineraryWithTitles);

    // Set arrival and departure dates for the single city, if applicable
    if (cityDetails.length === 1) {
      itineraryWithTitles.itinerary[0].arrivalDate = startDate;
      itineraryWithTitles.itinerary[0].departureDate = startDate;
    }

    // Handle activities and GptActivity creation
    for (const city of itineraryWithTitles.itinerary) {
      for (const day of city.days) {
        const activityIds = [];
        for (const activity of day.activities) {
          const cityId = cityDetails.find(
            (c) => c.name === city.currentCity
          )?._id;

          if (!activity.name) {
            logger.error(`Missing name in activity: ${JSON.stringify(activity)}`);
            continue;
          }

          if (cityId) {
            try {
              const originalActivity = await Activity.findOne({ name: activity.name });
              const newActivity = await GptActivity.create({
                name: activity.name,
                startTime: activity.startTime || '00:00',
                endTime: activity.endTime || '23:59',
                duration: activity.duration || 'Full day',
                timeStamp: activity.timeStamp || new Date().toISOString(),
                category: activity.category || 'General',
                cityId: cityId,
                activityId: originalActivity ? originalActivity._id : null,
              });

              logger.info(`New Activity Created: ${JSON.stringify(newActivity)}`);

              activityIds.push(newActivity._id);
            } catch (error) {
              logger.error(`Error creating GptActivity for city ${city.currentCity}:`, error);
            }
          }
        }
        day.activities = activityIds;
      }
    }

    // Add flight details if there are multiple cities
    let itineraryWithFlights = itineraryWithTitles;
    if (cityDetails.length > 1) {
      itineraryWithFlights = await addFlightDetailsToItinerary(
        itineraryWithTitles,
        adults,
        children,
        childrenAges,
        cityDetails
      );
      if (itineraryWithFlights.error) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json(httpFormatter({}, itineraryWithFlights.error, false));
      }
    }

    // Add taxi details if there are multiple cities
    let itineraryWithTaxi = itineraryWithFlights;
    if (cityDetails.length > 1) {
      itineraryWithTaxi = await addTaxiDetailsToItinerary(itineraryWithFlights);
    }
    itineraryWithTaxi = await addFerryDetailsToItinerary(itineraryWithTaxi);

    // Add hotel details (even if it's a single city)
    const enrichedItinerary = await addHotelDetailsToItinerary(
      itineraryWithTaxi,
      adults,
      childrenAges,
      rooms
    );

    // Remove any invalid transport or hotel details
    enrichedItinerary.itinerary.forEach((city) => {
      if (!city.transport || typeof city.transport !== 'object') {
        city.transport = null; // Ensure transport is either an object or null
      }

      if (!city.hotelDetails || !mongoose.isValidObjectId(city.hotelDetails)) {
        city.hotelDetails = null; // Ensure hotelDetails is either a valid ObjectId or null
      }
    });

    // Sum up the prices from flights, hotels, and activities
    let totalPrice = 0;
    let priceWithoutCoupon = 0;
    let price = 0;
    let totalFlightsPrice = 0;
    let totalTaxisPrice = 0;
    let totalFerriesPrice = 0;
    let totalHotelsPrice = 0;
    let totalActivitiesPrice = 0;
    const settings = await Settings.findOne();
    if (!settings) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Settings not found', false));
    }
    // Add transport prices if available from modeDetails
    for (const city of enrichedItinerary.itinerary) {
      let transferPrice = 0;
      let transferPriceWithoutCoupon = 0;

      if (city.transport && city.transport.mode && city.transport.modeDetails) {
        const modeId = city.transport.modeDetails;
        const mode = city.transport.mode;
        let modeDetails = null;

        // Handling different transport modes with respective markups
        if (mode === 'Flight') {
          modeDetails = await Flight.findById(modeId);
          if (modeDetails && modeDetails.price) {
            transferPrice = parseFloat(modeDetails.price);
            price += transferPrice;
            totalFlightsPrice += transferPrice * (1 + settings.flightMarkup / 100); 
            transferPrice += transferPrice * (settings.flightMarkup / 100);
            transferPriceWithoutCoupon = transferPrice;

            // Apply flight markup
            
            if(discount && discount.discountType!=null)
            {
              if(discount.discountType === 'couponless' && discount.applicableOn.flights===true)
                {
                  let response = await applyDiscountFunction({
                    discountId: discount._id,
                    userId: userId,
                    totalAmount: transferPrice
                  });
                  transferPrice -= response.discountAmount
                }
            }
            
          }
        } if (mode === 'Car') {
          modeDetails = await Taxi.findById(modeId);
          if (modeDetails && modeDetails.price) {
            transferPrice = parseFloat(modeDetails.price);
            totalTaxisPrice += transferPrice * (1 + settings.taxiMarkup / 100); 
            price += transferPrice;
            // Apply taxi markup
            transferPrice += transferPrice * (settings.taxiMarkup / 100);
            transferPriceWithoutCoupon = transferPrice
          }
        } if (mode === 'Ferry') {
          modeDetails = await Ferry.findById(modeId);
          if (modeDetails && modeDetails.price) {
            transferPrice = parseFloat(modeDetails.price);
            totalFerriesPrice += transferPrice * (1 + settings.ferryMarkup / 100);
            price += transferPrice;

            // Apply ferry markup
            transferPrice += transferPrice * (settings.ferryMarkup / 100);
            transferPriceWithoutCoupon = transferPrice
          }
        }
      }

      totalPrice += transferPrice;
      priceWithoutCoupon += transferPriceWithoutCoupon;
    }

    // Add hotel prices if available
    for (const city of enrichedItinerary.itinerary) {
      if (city.hotelDetails && city.hotelDetails.price) {
        const hotelPrice = parseFloat(city.hotelDetails.price) * city.stayDays * rooms.length;
        totalHotelsPrice += hotelPrice * (1 + settings.stayMarkup / 100);
        logger.info(`Added hotel cost for city ${city.currentCity}: ${hotelPrice}, Total Price Now: ${totalPrice}`);
        priceWithoutCoupon += hotelPrice + (hotelPrice * (settings.stayMarkup / 100));
        

        price += hotelPrice;
        if(discount && discount.discountType!=null){
          if(discount.discountType === 'couponless' && discount.applicableOn.hotels===true)
            {
              let response = await applyDiscountFunction({
                discountId: discount._id,
                userId: userId,
                totalAmount: hotelPrice
              });
              hotelPrice -= response.discountAmount
            }
        }
        totalPrice += hotelPrice + (hotelPrice * (settings.stayMarkup / 100));
        logger.info(`Added hotel cost for city with markup ${city.currentCity}: ${hotelPrice}, Total Price Now: ${totalPrice}`);
      }
    }
    const activityPricesPromisesWithoutCoupon = enrichedItinerary.itinerary.flatMap(city =>
      city.days.flatMap(day =>
        day.activities.map(async (activityId) => {
          const gptActivity = await GptActivity.findById(activityId);
          if (gptActivity) {
            const originalActivity = await Activity.findOne({ name: gptActivity.name });
            if (originalActivity && originalActivity.price) {
              const activityPricePerPerson = parseFloat(originalActivity.price);
              let totalActivityPrice = activityPricePerPerson * (adults + children); 
              return isNaN(totalActivityPrice) ? 0 : totalActivityPrice;
            } else {
              return 0;
              logger.info(`No price found for activity with ID ${activityId} in city ${city.currentCity}`);
              return 0;
            }
          }
          return 0;
        })
      )
    );
    
    const activityPricesWithoutCoupon = await Promise.all(activityPricesPromisesWithoutCoupon);
    price += activityPricesWithoutCoupon.reduce((acc, price) => acc + price, 0);
    let activityPrices = activityPricesWithoutCoupon.reduce((acc, price) => acc + price, 0);
    if(discount){
      if(discount.discountType === 'couponless' && discount.applicableOn.activities===true)
        {
          let response = await applyDiscountFunction({
            discountId: discount._id,
            userId: userId,
            totalAmount: activityPrices
          });
          activityPrices -= response.discountAmount
        }
    }
    totalPrice += activityPrices
    priceWithoutCoupon += activityPricesWithoutCoupon.reduce((acc, price) => acc + price, 0);
    totalActivitiesPrice = activityPricesWithoutCoupon.reduce((acc, price) => acc + price, 0);
    priceWithoutCoupon += priceWithoutCoupon  * (country.markup / 100);
    totalPrice += totalPrice * (country.markup / 100);

    if(discount && discount.discountType!=null){
      if(discount.discountType === 'couponless' && discount.applicableOn.package===true)
        {
          let response = await applyDiscountFunction({
            discountId: discount._id,
            userId: userId,
            totalAmount: totalPrice
          });
          totalPrice -= response.discountAmount
        }
    }
    // Apply the destination's markup to the total price
    

    let currentTotalPrice = priceWithoutCoupon;
    const disc = currentTotalPrice - totalPrice;
    totalPrice+=disc
    // Calculate and add 18% tax
    const taxAmount = currentTotalPrice * 0.18; // 18% tax
    const tax = totalPrice * 0.18;
    
    currentTotalPrice += taxAmount;

    // Add service fee
    currentTotalPrice += settings.serviceFee;
    currentTotalPrice -=disc;

    const serviceFee = settings.serviceFee;
    
    // Convert totalPrice to a string

    // Save the new itinerary with totalPrice as a string
    const newItinerary = new Itinerary({
      createdBy: userId,
      enrichedItinerary: enrichedItinerary,
      adults: adults,
      children: children,
      childrenAges: childrenAges,
      rooms: rooms,
      travellingWith: travellingWith,
      totalPrice: totalPrice.toFixed(2),
      currentTotalPrice: currentTotalPrice.toFixed(2),
      totalPriceWithoutMarkup: price.toFixed(2),
      couponlessDiscount: disc.toFixed(2),
      totalFlightsPrice: totalFlightsPrice.toFixed(2),
      totalHotelsPrice: totalHotelsPrice.toFixed(2),
      totalFerriesPrice: totalFerriesPrice.toFixed(2),
      totalTaxisPrice: totalTaxisPrice.toFixed(2),
      totalActivitiesPrice: totalActivitiesPrice.toFixed(2),
      discounts: discount ? [discount._id] : [],
      tax: tax.toFixed(2),
      serviceFee: serviceFee.toFixed(2)
    });
    await newItinerary.save();

    // Verify the user exists before creating the lead
    let user = await User.findById(userId);
    if (!user) {
      user = await Employee.findById(userId);
    }

    if (!user || !(user.phoneNumber || user.phone)) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(httpFormatter({}, 'Invalid user ID or missing contact number.', false));
    }

    // Create the new lead
    const newLead = new Lead({
      createdBy: userId,
      itineraryId: newItinerary._id,
      status: 'ML',
      contactNumber: user.phoneNumber || user.phone,
    });
    await newLead.save();


    // Return response with totalPersons
    return res
      .status(StatusCodes.OK)
      .json(
        httpFormatter(
          { newItinerary, newLead, totalPersons },
          'Create Itinerary and Lead Successful'
        )
      );
  } catch (error) {
    logger.error('Error creating itinerary or lead:', error);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(httpFormatter({}, 'Internal Server Error', false));
  }
};


export const getItineraryDetails = async (req, res) => {
  try {
    const { itineraryId } = req.params;

    // Find the itinerary by ID
    const itinerary = await Itinerary.findById(itineraryId);
    if (!itinerary) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Itinerary not found', false));
    }

    // Assuming enrichedItinerary contains a destination name, find its corresponding destination ID
    const destinationName = itinerary.enrichedItinerary?.destination;

    let destinationId = null;
    if (destinationName) {
      const destination = await Destination.findOne({ name: destinationName });
      if (destination) {
        destinationId = destination._id; // Assuming Destination model has an '_id' field representing the destinationId
      }
    }


    // Add destinationId to enrichedItinerary without altering the existing response structure
    if (destinationId) {
      itinerary.enrichedItinerary.destinationId = destinationId; // Add destinationId to enrichedItinerary object
    }

    return res.status(StatusCodes.OK).json(httpFormatter({ itinerary }, 'Itinerary details retrieved successfully', true));
  } catch (error) {
    console.error('Error retrieving itinerary details:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal Server Error', false));
  }
};

export const getFlightsInItinerary = async (req, res) => {
  try {
    const { itineraryId } = req.params;

    // Find the itinerary by ID
    const itinerary = await Itinerary.findById(itineraryId);
    if (!itinerary) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Itinerary not found', false));
    }

    // Extract flight IDs from the itinerary
    const flightIds = itinerary.enrichedItinerary.itinerary
      .flatMap(city => {
        return city.transport && city.transport.mode === "Flight"
          ? [city.transport.modeDetails] // Return flight ID if transport is a flight
          : []; // Return an empty array if not a flight
      })
      .filter(id => id !== null); // Filter out any null values
    // Fetch flight details from the Flight collection
    const flights = await Flight.find({ _id: { $in: flightIds } });

    return res.status(StatusCodes.OK).json(httpFormatter({ flights }, 'Flights retrieved successfully', true));
  } catch (error) {
    console.error('Error retrieving flights from itinerary:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal Server Error', false));
  }
};

export const getHotelsInItinerary = async (req, res) => {
  try {
    const { itineraryId } = req.params;

    // Find the itinerary by ID
    const itinerary = await Itinerary.findById(itineraryId);
    if (!itinerary) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Itinerary not found', false));
    }

    // Extract hotel IDs from the itinerary
    const hotelIds = itinerary.enrichedItinerary.itinerary
      .flatMap(city => city.hotelDetails) // Assuming hotelDetails holds the hotel IDs
      .filter(hotelId => hotelId !== null); // Filter out any null values

    // Fetch hotel details from the Hotel collection
    const hotels = await Hotel.find({ _id: { $in: hotelIds } });

    return res.status(StatusCodes.OK).json(httpFormatter({ hotels }, 'Hotels retrieved successfully', true));
  } catch (error) {
    console.error('Error retrieving hotels from itinerary:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal Server Error', false));
  }
};

export const getTransferDetails = async (req, res) => {
  try {
    const { itineraryId } = req.params;

    // Find the itinerary by ID
    const itinerary = await Itinerary.findById(itineraryId);
    if (!itinerary) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Itinerary not found', false));
    }

    // Extract transport details from the itinerary
    const transfers = itinerary.enrichedItinerary.itinerary
      .flatMap(city => {
        const transport = city.transport;
        if (transport && (transport.mode === "Car" || transport.mode === "Ferry")) {
          return {
            city: city.currentCity,
            mode: transport.mode,
            modeDetails: transport.modeDetails,
          };
        }
        return null;
      })
      .filter(transfer => transfer !== null); // Filter out any null values

    // Fetching details from Taxi and Ferry collections
    const taxiIds = transfers
      .filter(transfer => transfer.mode === "Car")
      .map(transfer => transfer.modeDetails);

    const ferryIds = transfers
      .filter(transfer => transfer.mode === "Ferry")
      .map(transfer => transfer.modeDetails);

    const [taxis, ferries] = await Promise.all([
      Taxi.find({ _id: { $in: taxiIds } }),
      Ferry.find({ _id: { $in: ferryIds } }),
    ]);

    // Prepare the response with direct details
    const transferDetails = transfers.map(transfer => {
      let details = null;
      if (transfer.mode === "Car") {
        details = taxis.find(taxi => taxi._id.toString() === transfer.modeDetails.toString());
      } else if (transfer.mode === "Ferry") {
        details = ferries.find(ferry => ferry._id.toString() === transfer.modeDetails.toString());
      }

      return {
        ...transfer,
        details: details || null, // Include the corresponding taxi or ferry details
      };
    });

    // Send the response with transfer details and their respective info
    return res.status(StatusCodes.OK).json(httpFormatter({ transferDetails }, 'Transfer details retrieved successfully', true));
  } catch (error) {
    console.error('Error retrieving transfer details from itinerary:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal Server Error', false));
  }
};




export const getAllActivities = async (req, res) => {
  try {
    const { itineraryId } = req.params;

    // Find the itinerary by ID and extract all activity IDs
    const itinerary = await Itinerary.findById(itineraryId).select('enrichedItinerary.itinerary.days.activities');
    if (!itinerary) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Itinerary not found', false));
    }

    // Extract all GPT activity IDs from the itinerary
    const gptActivityIds = itinerary.enrichedItinerary.itinerary
      .flatMap(city => city.days)
      .flatMap(day => day.activities)
      .filter(Boolean); // Remove null or undefined activity IDs

    // Fetch GPT activities and match with Activity table based on the name
    const gptActivities = await GptActivity.find({ _id: { $in: gptActivityIds } });

    // Prepare all activity names to be fetched from the Activity table
    const activityNames = gptActivities.map(gptActivity => gptActivity.name);

    // Fetch all corresponding detailed activities from the Activity table in one query
    const activityDetails = await Activity.find({ name: { $in: activityNames } });

    // Create a map for faster lookups by name
    const activityDetailsMap = activityDetails.reduce((acc, activity) => {
      acc[activity.name] = activity;
      return acc;
    }, {});

    // Construct the final activities array
    const detailedActivities = gptActivities.map(gptActivity => ({
      gptActivity,
      detailedActivity: activityDetailsMap[gptActivity.name] || null, // Match by name or return null if not found
    }));

    return res.status(StatusCodes.OK).json(httpFormatter({ activities: detailedActivities }, 'Activities retrieved successfully', true));
  } catch (error) {
    console.error('Error retrieving activities from itinerary:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal Server Error', false));
  }
};
export const getAllActivitiesForHistory = async (req, res) => {
  try {
    const { historyId } = req.params;

    // Find the itinerary by ID and extract all activity IDs
    const itinerary = await ItineraryVersion.findById(historyId).lean();

    if (!itinerary) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Itinerary not found', false));
    }

    // Extract all GPT activity IDs from the itinerary

    const gptActivityIds = itinerary.enrichedItinerary.itinerary
      .flatMap(city => city.days)
      .flatMap(day => day.activities)
      .filter(Boolean); // Remove null or undefined activity IDs

    // Fetch GPT activities and match with Activity table based on the name
    const gptActivities = await GptActivity.find({ _id: { $in: gptActivityIds } });

    // Prepare all activity names to be fetched from the Activity table
    const activityNames = gptActivities.map(gptActivity => gptActivity.name);

    // Fetch all corresponding detailed activities from the Activity table in one query
    const activityDetails = await Activity.find({ name: { $in: activityNames } });

    // Create a map for faster lookups by name
    const activityDetailsMap = activityDetails.reduce((acc, activity) => {
      acc[activity.name] = activity;
      return acc;
    }, {});

    // Construct the final activities array
    const detailedActivities = gptActivities.map(gptActivity => ({
      gptActivity,
      detailedActivity: activityDetailsMap[gptActivity.name] || null, // Match by name or return null if not found
    }));

    return res.status(StatusCodes.OK).json(httpFormatter({ activities: detailedActivities }, 'Activities retrieved successfully', true));
  } catch (error) {
    console.error('Error retrieving activities from itinerary:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal Server Error', false));
  }
};
export const addDaysToCity = async (req, res) => {
  const { itineraryId, cityIndex } = req.params;
  const { additionalDays } = req.body;

  try {
    // Fetch the itinerary from the database
    const itinerary = await Itinerary.findById(itineraryId).lean();
    if (!itinerary) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Itinerary not found', false));
    }

    // Check if the user has ownership or admin access
    const hasAccess = await checkOwnershipOrAdminAccess(req.user.userId, itinerary.createdBy, 'PATCH', `/api/v1/itineraries/${itineraryId}`);
    if (!hasAccess) {
      return res.status(StatusCodes.FORBIDDEN).json(httpFormatter({}, 'Access denied', false));
    }

    // Validate city index
    const parsedCityIndex = parseInt(cityIndex);
    if (parsedCityIndex < 0 || parsedCityIndex >= itinerary.enrichedItinerary.itinerary.length) {
      return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Invalid city index', false));
    }

    // Add new days to the city in the itinerary
    const city = itinerary.enrichedItinerary.itinerary[parsedCityIndex];

    // Ensure `cityId` is available for the city
    const cityId = city.cityId || (await City.findOne({ name: city.currentCity }).lean())._id;

    // Adding leisure activities for the new days
    for (let i = 0; i < additionalDays; i++) {
      const leisureActivity = await GptActivity.create({
        name: 'Leisure',
        startTime: '10:00 AM',
        endTime: '5:00 PM',
        duration: '7 hours',
        timeStamp: 'All day',
        category: 'Leisure',
        cityId: cityId, // Ensure cityId is correctly provided
      });

      city.days.push({
        day: city.days.length + 1, // Temporarily set the day number
        date: '', // Date will be set later
        activities: [leisureActivity._id],
      });
    }

    // Recalculate day numbers for all days in the city
    city.days = city.days.map((day, index) => ({
      ...day,
      day: index + 1,
    }));

    // Update the itinerary with the new city details
    itinerary.enrichedItinerary.itinerary[parsedCityIndex] = city;

    // Update dates for the entire itinerary
    const startDay = new Date(itinerary.enrichedItinerary.itinerary[0].days[0]?.date || new Date());
    const finalItinerary = addDatesToItinerary(itinerary.enrichedItinerary, startDay);

    // Use values from the itinerary to refetch details
    const { adults, children, childrenAges, rooms } = itinerary;
    const totalRooms = rooms.length

    // Refetch flight, taxi, and hotel details after adding days
    const itineraryWithNewDetails = await refetchFlightAndHotelDetails(
      { enrichedItinerary: finalItinerary },
      { adults, children, childrenAges, totalRooms }
    );

    // Save the updated itinerary to the database, including 'changedBy'
    await Itinerary.findByIdAndUpdate(
      itineraryId,
      { enrichedItinerary: itineraryWithNewDetails },
      {
        new: true,
        lean: true,
        changedBy: {
          userId: req.user.userId // Directly use req.user.userId without additional checks
        },
        comment: req.comment,
      }
    );

    await calculateTotalPriceMiddleware(req, res, async () => {
      // Respond after price calculation
      res.status(StatusCodes.OK).json(httpFormatter({ enrichedItinerary: itineraryWithNewDetails }, 'Days added and price updated successfully', true));
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, error.message, false));
  }
};

export const deleteDaysFromCity = async (req, res) => {
  const { itineraryId, cityIndex } = req.params;
  const { daysToDelete } = req.body;

  try {
    // Fetch the itinerary from the database
    const itinerary = await Itinerary.findById(itineraryId).lean();
    if (!itinerary) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Itinerary not found', false));
    }

    // Check if the user has ownership or admin access
    const hasAccess = await checkOwnershipOrAdminAccess(req.user.userId, itinerary.createdBy, 'PATCH', `/api/v1/itineraries/${itineraryId}`);
    if (!hasAccess) {
      return res.status(StatusCodes.FORBIDDEN).json(httpFormatter({}, 'Access denied', false));
    }

    // Validate city index
    const parsedCityIndex = parseInt(cityIndex);
    if (parsedCityIndex < 0 || parsedCityIndex >= itinerary.enrichedItinerary.itinerary.length) {
      return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Invalid city index', false));
    }

    // Remove the specified number of days from the city in the itinerary
    const city = itinerary.enrichedItinerary.itinerary[parsedCityIndex];

    if (daysToDelete > city.days.length) {
      return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Cannot delete more days than available in the city.', false));
    }

    // Remove the specified number of days from the end of the city's days array
    city.days.splice(-daysToDelete, daysToDelete);

    // Recalculate day numbers for all remaining days in the city
    city.days = city.days.map((day, index) => ({
      ...day,
      day: index + 1,
    }));

    // Update the itinerary with the modified city details
    itinerary.enrichedItinerary.itinerary[parsedCityIndex] = city;

    // Update dates for the entire itinerary
    const startDay = new Date(itinerary.enrichedItinerary.itinerary[0].days[0]?.date || new Date());
    const finalItinerary = addDatesToItinerary(itinerary.enrichedItinerary, startDay);

    // Use values from the itinerary to refetch details
    const { adults, children, childrenAges, rooms } = itinerary;
    const totalRooms = rooms.length
    // Refetch flight, taxi, and hotel details after deleting days
    const itineraryWithNewDetails = await refetchFlightAndHotelDetails(
      { enrichedItinerary: finalItinerary },
      { adults, children, childrenAges, totalRooms }
    );

    // Save the updated itinerary to the database, including 'changedBy'
    await Itinerary.findByIdAndUpdate(
      itineraryId,
      { enrichedItinerary: itineraryWithNewDetails },
      {
        new: true,
        lean: true,
        changedBy: {
          userId: req.user.userId, // Directly use req.user.userId without additional checks
        },
        comment: req.comment,
      }
    );

    // Send back the cleaned enrichedItinerary field
    await calculateTotalPriceMiddleware(req, res, async () => {
      // Respond after price calculation
      res.status(StatusCodes.OK).json(httpFormatter({ enrichedItinerary: itineraryWithNewDetails }, 'Days deleted and price updated successfully', true));
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, error.message, false));
  }
};



export const addCityToItineraryAtPosition = async (req, res) => {
  const { itineraryId } = req.params;
  const { newCity, position } = req.body;

  try {
    // Fetch the itinerary
    const itinerary = await Itinerary.findById(itineraryId).lean();
    if (!itinerary) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(httpFormatter({}, 'Itinerary not found', false));
    }

    // Use values from the itinerary
    const { adults, children, childrenAges, rooms } = itinerary;
    const totalRooms = rooms.length

    // Validate the position
    if (position < 0 || position > itinerary.enrichedItinerary.itinerary.length) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(httpFormatter({}, 'Invalid position for adding a city', false));
    }

    // Check if the city already exists in the itinerary
    const cityExists = itinerary.enrichedItinerary.itinerary.some(
      (city) => city.currentCity.toLowerCase() === newCity.toLowerCase()
    );

    if (cityExists) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(httpFormatter({}, `City '${newCity}' already exists in the itinerary`, false));
    }

    // Find the city by name to get its ObjectId
    const cityData = await City.findOne({ name: newCity }).lean();
    if (!cityData) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(httpFormatter({}, `City '${newCity}' not found in the database`, false));
    }

    const cityId = cityData._id;
    const stayDays = 1
    // Generate the new city object without travel details (as it is the starting point)
    const cityToAdd = {
      currentCity: newCity,
      nextCity: null,
      stayDays: stayDays,
      transport: {
        mode: null,
        modeDetails: null,
      },
      days: [],
      hotelDetails: null,
    };
    if (position === 0) {
      // Create the arrival activity in GptActivity
      const arrivalActivity = await GptActivity.create({
        name: `Arrival in ${newCity}`,
        startTime: "10:00 AM",
        endTime: "11:00 AM",
        duration: "1 hour",
        timeStamp: "All day",
        category: "Arrival",
        cityId: cityId,
      });

      // Add the arrival activity's _id to the first day of the new city
      cityToAdd.days.push({
        day: 1,
        date: '', // Date will be set later
        activities: [arrivalActivity._id],
      });
    }
    // Add leisure activities for each stay day in the new city, starting from day 2
    for (let dayIndex = 2; dayIndex <= (stayDays) + 1; dayIndex++) {
      const leisureActivity = await GptActivity.create({
        name: 'Leisure',
        startTime: '10:00 AM',
        endTime: '5:00 PM',
        duration: '7 hours',
        timeStamp: 'All day',
        category: 'Leisure',
        cityId: cityId,
      });

      cityToAdd.days.push({
        day: dayIndex,
        date: '', // Date will be set later
        activities: [leisureActivity._id],
      });
    }

    // Insert the new city at the specified position
    itinerary.enrichedItinerary.itinerary.splice(position, 0, cityToAdd);

    // Function to generate a travel activity and return its ID
    const generateTravelActivity = async (fromCity, toCity) => {
      const travelActivity = await GptActivity.create({
        name: `Travel from ${fromCity} to ${toCity}`,
        startTime: '09:00 AM',
        endTime: '12:00 PM',
        duration: '3 hours',
        timeStamp: 'Morning',
        category: 'Travel',
        cityId: (await City.findOne({ name: fromCity }))._id,
      });

      return travelActivity;
    };

    const addTravelActivity = async (fromCity, toCity, city, previousCity) => {
      if (!city) {
        throw new Error('City object is null or undefined when trying to add travel activity.');
      }

      // Ensure city.transport is properly initialized
      if (!city.transport) {
        city.transport = { mode: null, modeDetails: null };
      }

      // Generate transport details using OpenAI
      const transportDetails = await generateTransportDetails({
        departureCity: fromCity,
        arrivalCity: toCity,
      });

      const travelActivity = await generateTravelActivity(fromCity, toCity);

      // Set transport details for the previous city
      previousCity.transport = {
        mode: transportDetails.mode,
        modeDetails: travelActivity._id,
      };

      // Add travel activity to the first day of the city's itinerary
      city.days.unshift({
        day: 1,
        date: '', // Date will be set later
        activities: [travelActivity._id],
      });
    };

    if (position === 0) {
      // If added at the start, set transport details for the next city
      const nextCityIndex = 1;
      if (nextCityIndex < itinerary.enrichedItinerary.itinerary.length) {
        const nextCity = itinerary.enrichedItinerary.itinerary[nextCityIndex];
        nextCity.days[0].activities = await filterOutTravelActivities(nextCity.days[0].activities);
        // Generate transport details for going from the new city to the next city
        const transportDetails = await generateTransportDetails({
          departureCity: newCity,
          arrivalCity: nextCity.currentCity,
        });

        const travelActivity = await generateTravelActivity(newCity, nextCity.currentCity);

        // Set transport details in the new city
        cityToAdd.transport.mode = transportDetails.mode;
        cityToAdd.transport.modeDetails = travelActivity._id;

        // Ensure nextCity.transport is initialized
        if (!nextCity.transport) {
          nextCity.transport = { mode: null, modeDetails: null };
        }

        // Add the travel activity to the first day of the next city
        nextCity.days.unshift({
          day: 1,
          date: '', // Date will be set later
          activities: [travelActivity._id],
        });
      }
    } else if (position === itinerary.enrichedItinerary.itinerary.length - 1) {
      // If added at the end, add transport details for the previous city to the new city
      const previousCity = itinerary.enrichedItinerary.itinerary[position - 1];

      // Add travel activity to the new city from the previous city
      await addTravelActivity(previousCity.currentCity, newCity, cityToAdd, previousCity);
    } else {
      // If added in the middle
      const previousCity = itinerary.enrichedItinerary.itinerary[position - 1];
      const nextCity = itinerary.enrichedItinerary.itinerary[position + 1];

      // Remove existing travel activity from the next city
      nextCity.days[0].activities = await filterOutTravelActivities(nextCity.days[0].activities);

      // Add travel activity to the new city from the previous city
      await addTravelActivity(previousCity.currentCity, newCity, cityToAdd, previousCity);

      // Add travel activity from new city to next city
      await addTravelActivity(newCity, nextCity.currentCity, nextCity, cityToAdd);
    }

    // Helper function to filter out travel activities from the list of activities
    async function filterOutTravelActivities(activityIds) {
      const filteredActivities = [];
      for (let activityId of activityIds) {
        const activity = await GptActivity.findById(activityId);
        if (activity && activity.category !== 'Travel' && activity.category!=='Arrival') {
          filteredActivities.push(activityId);
        }
      }
      return filteredActivities;
    }

    // Remove any days with no activities
    itinerary.enrichedItinerary.itinerary.forEach((city) => {
      city.days = city.days.filter(day => day.activities.length > 0);
    });

    // Update dates for the entire itinerary
    const startDay = new Date(itinerary.enrichedItinerary.itinerary[0].days[0]?.date || new Date());
    const finalItinerary = addDatesToItinerary(itinerary.enrichedItinerary, startDay);

    // Refetch flight, taxi, and hotel details for all cities
    const enrichedItinerary = await refetchFlightAndHotelDetails(
      { enrichedItinerary: finalItinerary },
      { adults, children, childrenAges, totalRooms }
    );

    // Save the updated itinerary
    await Itinerary.findByIdAndUpdate(
      itineraryId,
      { enrichedItinerary },
      {
        new: true,
        lean: true,
        changedBy: { userId: req.user.userId },
        comment: req.comment,
      }
    );

    await calculateTotalPriceMiddleware(req, res, async () => {
      // Respond after price calculation
      console.log("res shwdbjw  bd", req, res)
      res.status(StatusCodes.OK).json(httpFormatter({ enrichedItinerary }, 'City added and price updated successfully', true));
    });
  } catch (error) {
    console.error('Error adding city to itinerary:', error);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(httpFormatter({}, 'Internal Server Error', false));
  }
};



export const deleteCityFromItinerary = async (req, res) => {
  const { itineraryId, cityIndex } = req.params;

  try {
    // Fetch the itinerary
    const itinerary = await Itinerary.findById(itineraryId).lean();
    if (!itinerary) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(httpFormatter({}, 'Itinerary not found', false));
    }

    // Use values from the itinerary
    const { adults, children, childrenAges, rooms } = itinerary;
    const totalRooms = rooms.length

    // Validate city index
    const parsedCityIndex = parseInt(cityIndex);
    if (parsedCityIndex < 0 || parsedCityIndex >= itinerary.enrichedItinerary.itinerary.length) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(httpFormatter({}, 'Invalid city index', false));
    }

    // Store the original start date
    const startDay = new Date(itinerary.enrichedItinerary.itinerary[0].days[0].date);

    // Remove the city to be deleted
    const cityToDelete = itinerary.enrichedItinerary.itinerary.splice(parsedCityIndex, 1)[0];

    // If no cities are left, clear the itinerary and update it
    if (itinerary.enrichedItinerary.itinerary.length === 0) {
      itinerary.enrichedItinerary.itinerary = [];
    } else if (parsedCityIndex === 0) {
     // If deleting the first city, add an arrival activity to the new first city
     const newFirstCity = itinerary.enrichedItinerary.itinerary[0];
     const newFirstCityDetails = await City.findOne({ name: newFirstCity.currentCity });
     console.log("jfds",newFirstCity);
     const arrivalActivity = await GptActivity.create({
       name: `Arrival in ${newFirstCity.currentCity}`,
       startTime: '10:00 AM',
       endTime: '11:00 AM',
       duration: '1 hour',
       timeStamp: 'All day',
       category: 'Arrival',
       cityId: newFirstCityDetails._id,
     });
// Remove old travel activity if any
if (newFirstCity.days[0].activities.length >= 1) {
  newFirstCity.days[0].activities.shift(); // Remove the first activity if it’s a travel activity
}
     // Add the arrival activity to the new first city’s first day
     if (newFirstCity.days.length === 0) {
       newFirstCity.days.push({
         day: 1,
         activities: [arrivalActivity._id],
       });
     } else {
       newFirstCity.days[0].activities.unshift(arrivalActivity._id);
     }
 
     // Update transport if needed
     if (newFirstCity.transport && newFirstCity.transport.mode) { 
       if (!newFirstCity.nextCity) {
         newFirstCity.transport = { mode: null, modeDetails: null };
       }
     
      }
    } else if (parsedCityIndex === itinerary.enrichedItinerary.itinerary.length) {
      // If deleting the last city
      const previousCity = itinerary.enrichedItinerary.itinerary[parsedCityIndex - 1];
      previousCity.nextCity = null;
      previousCity.transport = { mode: null, modeDetails: null };
    } else {
      // If deleting a middle city
      const previousCity = itinerary.enrichedItinerary.itinerary[parsedCityIndex - 1];
      const nextCity = itinerary.enrichedItinerary.itinerary[parsedCityIndex];

      // Update nextCity reference and transport mode
      previousCity.nextCity = nextCity.currentCity;

      const transportDetails = await generateTransportDetails({
        departureCity: previousCity.currentCity,
        arrivalCity: nextCity.currentCity,
      });

      previousCity.transport = { mode: transportDetails.mode, modeDetails: null };

      // Remove old travel activity from next city
      if (nextCity.days[0] && nextCity.days[0].activities.length > 0) {
        const oldTravelActivityId = nextCity.days[0].activities.shift();

        // Remove the day if no activities left
        if (nextCity.days[0].activities.length === 0) {
          nextCity.days.shift();
        }
      }

      // Create new travel activity between previous and next city
      const previousCityDetails = await City.findOne({ name: previousCity.currentCity });
      if (!previousCityDetails) {
        return res
          .status(StatusCodes.NOT_FOUND)
          .json(httpFormatter({}, 'Previous city details not found', false));
      }

      const travelActivity = await GptActivity.create({
        name: `Travel from ${previousCity.currentCity} to ${nextCity.currentCity}`,
        startTime: '09:00 AM',
        endTime: '12:00 PM',
        duration: '3 hours',
        timeStamp: 'Morning',
        category: 'Travel',
        cityId: previousCityDetails._id,
      });

      if (nextCity.days.length === 0) {
        // If the next city has no days, create a new day with the travel activity as the first day
        nextCity.days.push({
          day: 1,
          activities: [travelActivity._id],
        });
      } else {
        // Create a new day for the travel activity and insert it as the first day
        nextCity.days.unshift({
          day: 1,
          activities: [travelActivity._id],
        });

        // Update the day numbers for the rest of the days
        nextCity.days.slice(1).forEach((day, index) => {
          day.day = index + 2; // Update day numbers starting from 2 for all following days
        });
      }
    }

    // Recalculate dates for the entire itinerary
    const finalItinerary = addDatesToItinerary(itinerary.enrichedItinerary, startDay);
console.log(JSON.stringify(finalItinerary));
    // Refetch flight, taxi, and hotel details for all cities in the itinerary
    const enrichedItinerary = await refetchFlightAndHotelDetails(
      { enrichedItinerary: finalItinerary },
      { adults, children, childrenAges, totalRooms }
    );

    // Save the updated itinerary
    await Itinerary.findByIdAndUpdate(
      itineraryId,
      { enrichedItinerary },
      {
        new: true,
        lean: true,
        changedBy: { userId: req.user.userId },
        comment: req.comment,
      }
    );

    await calculateTotalPriceMiddleware(req, res, async () => {
      // Respond after price calculation
      res.status(StatusCodes.OK).json(httpFormatter({ enrichedItinerary }, 'City deleted and price updated successfully', true));
    });
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(httpFormatter({}, error.message, false));
  }
};



export const replaceActivityInItinerary = async (req, res) => {
  const { itineraryId, oldActivityId } = req.params;
  const { newActivityId } = req.body;

  try {
    // Fetch the itinerary
    const itinerary = await Itinerary.findById(itineraryId);
    if (!itinerary) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Itinerary not found' });
    }

    // Check if the user has ownership or admin access
    const hasAccess = await checkOwnershipOrAdminAccess(req.user.userId, itinerary.createdBy, 'PATCH', `/api/v1/itineraries/${itineraryId}`);
    if (!hasAccess) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: 'Access denied' });
    }

    // Fetch the old activity from the GptActivity table
    const oldGptActivity = await GptActivity.findById(oldActivityId);
    if (!oldGptActivity) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Old activity not found' });
    }

    // Fetch the new activity from the Activity table
    const newActivity = await Activity.findById(newActivityId);
    if (!newActivity) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'New activity not found' });
    }

    // Format the start time from the old activity
    const startTime = oldGptActivity.startTime; // e.g., "10:00 AM"
    const [time, modifier] = startTime.split(' '); // Split into "10:00" and "AM"
    let [startHour, startMinute] = time.split(':'); // Split "10:00" into "10" and "00"

    // Convert startHour to 24-hour format
    startHour = Number(startHour);
    if (modifier === 'PM' && startHour !== 12) {
      startHour += 12; // Convert PM hours to 24-hour format
    } else if (modifier === 'AM' && startHour === 12) {
      startHour = 0; // Handle 12 AM as midnight
    }

    // Create a start date and set hours and minutes
    const startDate = new Date();
    startDate.setHours(startHour);
    startDate.setMinutes(Number(startMinute));

    // Extract the first number from newActivity.duration (e.g., "7 hours", "3-5 hours")
    const durationMatch = newActivity.duration.match(/\d+/);
    const durationInHours = durationMatch ? Number(durationMatch[0]) : 4; // Default to 1 hour if no match
    // Add the duration to the start time
    const endDate = new Date(startDate.getTime() + durationInHours * 60 * 60000);
    // Format the end time to "10:00 AM" format
    const endTime = endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });

    // Create the new activity in the GptActivity table
    const newGptActivity = await GptActivity.create({
      name: newActivity.name,
      startTime: startTime, // Use the old activity's start time
      endTime: endTime,     // Use the calculated end time
      duration: newActivity.duration,
      category: newActivity.category || 'General',
      cityId: newActivity.city,
      timeStamp: oldGptActivity.timeStamp, // Use the old activity's timestamp
      activityId: newActivityId, // Reference to the Activity table
    });

    // Replace the old activity in the itinerary with the new GptActivity ID
    let activityReplaced = false; // To track if the activity was replaced
    itinerary.enrichedItinerary.itinerary.forEach(city => {
      city.days.forEach(day => {
        const activityIndex = day.activities.indexOf(oldActivityId);
        if (activityIndex !== -1) {
          // Replace the old activity with the new GptActivity ID
          day.activities[activityIndex] = newGptActivity._id;
          activityReplaced = true;
        }
      });
    });

    if (!activityReplaced) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Old activity not found in itinerary', success: false });
    }

    // Save the updated itinerary, including 'changedBy' for tracking purposes
    await Itinerary.findByIdAndUpdate(
      itineraryId,
      { enrichedItinerary: itinerary.enrichedItinerary },
      {
        new: true,
        lean: true,
        changedBy: {
          userId: req.user.userId // Use req.user.userId directly for tracking the change
        },
        comment: req.comment
      }
    );

    // Call the price calculation middleware
    await calculateTotalPriceMiddleware(req, res, async () => {
      // Respond after price calculation
      res.status(StatusCodes.OK).json(httpFormatter({ enrichedItinerary: itinerary.enrichedItinerary }, 'Activity replaced and price updated successfully', true));
    });

  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error', error: error.message });
  }
};



export const deleteActivityInItinerary = async (req, res) => {
  const { itineraryId, oldActivityId } = req.params;

  try {
    // Fetch the itinerary
    const itinerary = await Itinerary.findById(itineraryId);
    if (!itinerary) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Itinerary not found' });
    }

    // Check if the user has ownership or admin access
    const hasAccess = await checkOwnershipOrAdminAccess(req.user.userId, itinerary.createdBy, 'PATCH', `/api/v1/itineraries/${itineraryId}`);
    if (!hasAccess) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: 'Access denied' });
    }
    // Fetch the old activity from the GptActivity table
    const oldGptActivity = await GptActivity.findById(oldActivityId);
    if (!oldGptActivity) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Old activity not found' });
    }


    const newGptActivity_id = await createLeisureActivityIfNotExist(oldGptActivity.cityId)

    // Replace the old activity in the itinerary with the new GptActivity ID
    let activityReplaced = false; // To track if the activity was replaced
    itinerary.enrichedItinerary.itinerary.forEach(city => {
      city.days.forEach(day => {
        const activityIndex = day.activities.indexOf(oldActivityId);
        if (activityIndex !== -1) {
          // Replace the old activity with the new GptActivity ID
          day.activities[activityIndex] = newGptActivity_id;
          activityReplaced = true;
        }
      });
    });

    if (!activityReplaced) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Old activity not found in itinerary', success: false });
    }

    // Save the updated itinerary, including 'changedBy' for tracking purposes
    await Itinerary.findByIdAndUpdate(
      itineraryId,
      { enrichedItinerary: itinerary.enrichedItinerary },
      {
        new: true,
        lean: true,
        changedBy: {
          userId: req.user.userId // Use req.user.userId directly for tracking the change
        },
        comment: req.comment
      }
    );

    // Call the price calculation middleware
    await calculateTotalPriceMiddleware(req, res, async () => {
      // Respond after price calculation
      res.status(StatusCodes.OK).json(httpFormatter({ enrichedItinerary: itinerary.enrichedItinerary }, 'Activity replaced and price updated successfully', true));
    });

  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error', error: error.message });
  }
};

export const changeTransportModeInCity = async (req, res) => {
  const { itineraryId, cityIndex } = req.params;
  const { newMode } = req.body;

  try {
    // Fetch the itinerary
    const itinerary = await Itinerary.findById(itineraryId);
    if (!itinerary) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Itinerary not found' });
    }
    const { adults, children, childrenAges, rooms } = itinerary;
    const totalRooms = rooms.length
    // Check if the user has ownership or admin access
    const hasAccess = await checkOwnershipOrAdminAccess(req.user.userId, itinerary.createdBy, 'PATCH', `/api/v1/itineraries/${itineraryId}`);
    if (!hasAccess) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: 'Access denied' });
    }

    // Find the city by cityIndex and update the transport mode
    const city = itinerary.enrichedItinerary.itinerary[cityIndex];
    if (!city) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'City not found in itinerary' });
    }

    // Change the transport mode
    city.transport.mode = newMode;
    const enrichedItinerary = await refetchFlightAndHotelDetails(
      { enrichedItinerary: itinerary.enrichedItinerary },
      { adults, children, childrenAges, totalRooms }
    );
    // Save the updated itinerary
    await Itinerary.findByIdAndUpdate(
      itineraryId,
      { enrichedItinerary: itinerary.enrichedItinerary },
      {
        new: true,
        lean: true,
        changedBy: {
          userId: req.user.userId // Use req.user.userId directly for tracking the change
        },
        comment: req.comment
      }
    );

    // Call middleware to calculate the total price
    await calculateTotalPriceMiddleware(req, res, async () => {
      // Respond after price calculation
      res.status(StatusCodes.OK).json(httpFormatter({ enrichedItinerary: itinerary.enrichedItinerary }, 'Transport mode changed and price updated successfully', true));
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error', error: error.message });
  }
};


export const replaceFlightInItinerary = async (req, res) => {
  const { itineraryId, modeDetailsId } = req.params; // Get itinerary and flight ID (oldFlightId)
  const { selectedFlight } = req.body; // New flight details from the frontend


  const departureCity = await City.findOne({ name: selectedFlight.segments[0].from });
  const arrivalCity = await City.findOne({ name: selectedFlight.segments[0].to });

  if (!departureCity || !arrivalCity) {
    return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'City not found', false));
  }


  try {
    // Fetch the itinerary
    const itinerary = await Itinerary.findById(itineraryId);
    if (!itinerary) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Itinerary not found', false));
    }

    // Check if the user has ownership or admin access
    const hasAccess = await checkOwnershipOrAdminAccess(req.user.userId, itinerary.createdBy, 'PATCH', `/api/v1/itineraries/${itineraryId}`);
    if (!hasAccess) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: 'Access denied' });
    }

    // Prepare baggageIncluded based on the presence of baggage details
    const baggageIncluded = selectedFlight.segments.some(segment => segment.baggage && segment.baggage.length > 0);

    // Convert the baggage details to fit the schema structure
    const baggageDetails = {
      cabinBag: selectedFlight.segments[0].baggage.find(bag => bag.type === 'carry_on')?.quantity || 0,
      checkedBag: selectedFlight.segments[0].baggage.find(bag => bag.type === 'checked')?.quantity || 0,
    };





    // Create the new flight
    const newFlight = new Flight({
      departureCityId: departureCity._id,
      arrivalCityId: arrivalCity._id,
      baggageIncluded: baggageIncluded,
      baggageDetails: baggageDetails,
      price: parseFloat(selectedFlight.price.replace(/[^0-9.-]+/g, '')),
      currency: 'INR',
      airline: selectedFlight.airline,
      departureDate: new Date(selectedFlight.departureDate),
      flightSegments: selectedFlight.segments.map(segment => {
        // Combine the departureDate with departureTime and arrivalTime to create a full date-time
        const departureDateTimeString = `${selectedFlight.departureDate} ${segment.departureTime}`;
        const arrivalDateTimeString = `${selectedFlight.departureDate} ${segment.arrivalTime}`;

        // Create valid Date objects
        const departureTime = new Date(departureDateTimeString);
        const arrivalTime = new Date(arrivalDateTimeString);

        // Validate that the dates are valid
        if (isNaN(departureTime.getTime()) || isNaN(arrivalTime.getTime())) {
          throw new Error("Invalid date format for departure or arrival time");
        }

        return {
          departureTime,
          arrivalTime,
          flightNumber: segment.flightNumber, // Keep it as a string
        };
      }),
    });

    // Save the new flight to the DB
    const savedFlight = await newFlight.save();

    // Replace the old flight in the itinerary with the new one
    let flightReplaced = false; // To track if the flight was replaced

    itinerary.enrichedItinerary.itinerary.forEach(city => {
      if (city.transport && city.transport.modeDetails && city.transport.modeDetails.toString() === modeDetailsId) {
        city.transport.modeDetails = savedFlight._id;
        flightReplaced = true;
      }
    });

    if (!flightReplaced) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Old flight not found in itinerary', false));
    }


    // Delete the old flight from the Flight table
    await Flight.findByIdAndDelete(modeDetailsId);

    // Save the updated itinerary, including 'changedBy' for tracking purposes
    await Itinerary.findByIdAndUpdate(
      itineraryId,
      { enrichedItinerary: itinerary.enrichedItinerary },
      {
        new: true,
        lean: true,
        changedBy: {
          userId: req.user.userId // Use req.user.userId directly for tracking the change
        },
        comment: req.comment
      }
    );

    await calculateTotalPriceMiddleware(req, res, async () => {
      // Respond after price calculation
      res.status(StatusCodes.OK).json(httpFormatter({ enrichedItinerary: itinerary.enrichedItinerary }, 'Flight replaced and price updated successfully', true));
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error', error: error.message });
  }
};


export const replaceHotelInItinerary = async (req, res) => {
  const { itineraryId, hotelDetailsId } = req.params; // Get itinerary and old hotel ID
  const { selectedHotel } = req.body; // Selected hotel details from the frontend

  try {
    // Fetch the itinerary
    const itinerary = await Itinerary.findById(itineraryId);
    if (!itinerary) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Itinerary not found' });
    }

    // Check if the user has ownership or admin access
    const hasAccess = await checkOwnershipOrAdminAccess(req.user.userId, itinerary.createdBy, 'PATCH', `/api/v1/itineraries/${itineraryId}`);
    if (!hasAccess) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: 'Access denied' });
    }

    // Prepare the rooms data from selectedHotel to handle multiple rooms
    const roomsData = selectedHotel.rooms.map(room => ({
      roomType: room.roomType,
      roomtag: room.roomtag,
      area: room.area,
      accommodates: room.accommodates,
      bedType: room.bedType,
      facilities: room.facilities,
      rating: parseFloat(room.rating), // Parse rating to number if necessary
      image: room.image,
      price: parseFloat(room.price), // Convert the price to a number if required
      priceDrop: room.priceDrop,
    }));

    
    // Create the new hotel with multiple rooms
    const newHotel = new Hotel({
      name: selectedHotel.hotelName,
      address: selectedHotel.location, // Assuming 'location' is the hotel address
      rating: Math.max(...roomsData.map(room => room.rating)), // Take the highest rating among all rooms
      price: Math.min(...roomsData.map(room => room.price)), // Take the minimum price among all rooms
      currency: 'INR',
      image: roomsData[0]?.image, // Take the image from the first room for a general representation
      cancellation: roomsData.some(room => room.facilities.includes('Free cancellation available'))
        ? 'Free cancellation available'
        : '',
      checkin: selectedHotel.checkInDate,
      checkout: selectedHotel.checkOutDate,
      roomType: roomsData.map(room => room.roomType).join(', '), // Concatenate all room types as a string
      refundable: roomsData.some(room => room.roomtag === 'REFUNDABLE'),
      cityId: selectedHotel.cityId,
      rooms: roomsData, // Save all the rooms information as an array
    });

    // Save the new hotel to the DB
    const savedHotel = await newHotel.save();

    // Replace the old hotel in the itinerary with the new one
    let hotelReplaced = false; // To track if the hotel was replaced
    itinerary.enrichedItinerary.itinerary.forEach(city => {
      if (city.hotelDetails && city.hotelDetails.toString() === hotelDetailsId) {
        city.hotelDetails = savedHotel._id; // Replace with the new hotel's ID
        hotelReplaced = true;
      }
    });

    if (!hotelReplaced) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Old hotel not found in itinerary', success: false });
    }

    // Delete the old hotel from the DB
    await Hotel.findByIdAndDelete(hotelDetailsId);

    // Save the updated itinerary, including 'changedBy' for tracking purposes
    await Itinerary.findByIdAndUpdate(
      itineraryId,
      { enrichedItinerary: itinerary.enrichedItinerary },
      {
        new: true,
        lean: true,
        changedBy: {
          userId: req.user.userId, // Use req.user.userId directly for tracking the change
        },
        comment: req.comment,
      }
    );

    // Fetch the updated itinerary to ensure all data is properly populated
    const updatedItinerary = await Itinerary.findById(itineraryId)
      .populate('enrichedItinerary.itinerary.hotelDetails') // Ensure the hotelDetails field is populated
      .lean();

    if (!updatedItinerary) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Updated itinerary not found' });
    }

    await calculateTotalPriceMiddleware(req, res, async () => {
      // Respond after price calculation
      res.status(StatusCodes.OK).json(httpFormatter({ enrichedItinerary: itinerary.enrichedItinerary }, 'Hotel replaced and price updated successfully', true));
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error', error: error.message });
  }
};


export const getTotalTripsByUsers = async (req, res) => {
  try {

    const itinerariesCount = await Itinerary.aggregate([
      {
        $group: {
          _id: "$createdBy",
          totalTrips: { $sum: 1 }
        }
      }
    ]);


    return res.status(StatusCodes.OK).json(httpFormatter({ itinerariesCount }, 'Total trips counted successfully', true));
  } catch (error) {
    console.error('Error counting itineraries by user:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal Server Error', false));
  }
};


export const getItinerariesByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find itineraries by createdBy field (userId)
    const itineraries = await Itinerary.find({ createdBy: userId });

    if (!itineraries.length) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'No itineraries found for this user', false));
    }

    return res.status(StatusCodes.OK).json(httpFormatter({ itineraries }, 'Itineraries retrieved successfully', true));
  } catch (error) {
    console.error('Error fetching itineraries for user:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal Server Error', false));
  }
};

export const getAllUsersStatistics = async (req, res) => {
  try {
    const statistics = await Itinerary.aggregate([
      {
        $group: {
          _id: "$createdBy", 
          totalItineraries: { $sum: 1 },
          uniqueDestinations: { $addToSet: "$enrichedItinerary.destination" },
          totalFlights: {
            $sum: {
              $size: {
                $ifNull: [
                  {
                    $filter: {
                      input: "$enrichedItinerary.itinerary",
                      cond: { $eq: ["$$this.transport.mode", 'Flight'] }
                    }
                  },
                  [] // Provide an empty array if the field is missing
                ]
              }
            }
          },
          totalActivitiesIds: {
            $addToSet: {
              $reduce: {
                input: "$enrichedItinerary.itinerary.days",
                initialValue: [],
                in: { $concatArrays: ["$$value", "$$this.activities"] }
              }
            }
          },
          totalPricePaid: { $sum: { $ifNull: [{ $toDouble: "$currentTotalPrice" }, 0] } },
          totalTripPrice: { $sum: { $ifNull: [{ $toDouble: "$totalPrice" }, 0] } },
          totalDiscount: { $sum: { $add: [{ $toDouble: "$couponlessDiscount" }, { $toDouble: "$generalDiscount" }] } },
          totalServiceFee: { $sum: { $ifNull: [{ $toDouble: "$serviceFee" }, 0] } },
          totalTaxes: { $sum: { $ifNull: [{ $toDouble: "$tax" }, 0] } },
          groupedPackages: {
            $sum: {
              $cond: {
                if: { $ne: ["$travellingWith", "Solo"] },
                then: 1,
                else: 0
              }
            }
          }
        }
      },
      {
        // Flatten the array completely using $reduce and $concatArrays recursively
        $addFields: {
          totalActivitiesIds: {
            $reduce: {
              input: {
                $reduce: {
                  input: "$totalActivitiesIds",
                  initialValue: [],
                  in: { $concatArrays: ["$$value", "$$this"] }
                }
              },
              initialValue: [],
              in: { $concatArrays: ["$$value", "$$this"] }
            }
          },
        }
      },
      {
        // Convert the flattened IDs to ObjectId using $toObjectId
        $addFields: {
          totalActivitiesIds: {
            $map: {
              input: "$totalActivitiesIds",  // The fully flattened array
              as: "id",
              in: {
                $cond: {
                  if: { $eq: [{ $type: "$$id" }, "string"] }, // Convert only if it's a string
                  then: { $toObjectId: "$$id" },  // Convert to ObjectId
                  else: "$$id"  // Leave it as is if it's already an ObjectId
                }
              }
            }
          },
        }
      },
      {
        // Perform the lookup after converting the IDs
        $lookup: {
          from: "gptactivities", // The activities collection
          localField: "totalActivitiesIds",
          foreignField: "_id",
          as: "validActivities"
        }
      },
      {
        // Filter valid activities and log filtered activities for debugging
        $addFields: {
          filteredActivities: {
            $filter: {
              input: "$validActivities",
              as: "activity",
              cond: {
                $and: [
                  { $ne: ["$$activity.category", "Travel"] },
                  { $ne: ["$$activity.category", "Leisure"] }
                ]
              }
            }
          },
          
          totalActivities: { $size: { $ifNull: ["$filteredActivities", []] } } // Ensure this is always an array
        }
      },
      {
        $addFields: {
          filteredActivities: {
            $filter: {
              input: "$validActivities",
              as: "activity",
              cond: {
                $and: [
                  { $ne: ["$$activity.category", "Travel"] },
                  { $ne: ["$$activity.category", "Leisure"] }
                ]
              }
            }
          },
          totalActivities: { $size: { $ifNull: ["$filteredActivities", []] } } // Ensure this is always an array
        }
      },
      {
        // Perform the user lookup and join
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userDetails"
        }
      },
      {
        $unwind: "$userDetails"
      },
      {
        $project: {
          _id: 0,
          userId: "$_id",
          userName: { $concat: ["$userDetails.firstName", " ", "$userDetails.lastName"] },
          totalItineraries: 1,
          totalDestinations: { $size: "$uniqueDestinations" },
          totalFlights: 1,
          totalActivities: 1,
          totalPricePaid: 1,
          totalTripPrice: 1,
          totalDiscount: 1,
          totalServiceFee: 1,
          totalTaxes: 1,
          groupedPackages: 1 // Include the new field in the projection
        }
      }
    ]);

    if (!statistics.length) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'No statistics found for any user', false));
    }

    return res.status(StatusCodes.OK).json(httpFormatter(statistics, 'User statistics retrieved successfully', true));
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal Server Error', false));
  }
};

export const getDestinationStatistics = async (req, res) => {
  try {
    const statistics = await Itinerary.aggregate([
      {
        // Group by destination
        $group: {
          _id: "$enrichedItinerary.destination", // Group by destination name
          totalItineraries: { $sum: 1 }, // Count total itineraries per destination
          groupedPackages: {
            $sum: {
              $cond: {
                if: { 
                  $and: [
                    { $ne: ["$travellingWith", "Solo"] }, // Check at root level if not "Solo"
                    { $ne: ["$travellingWith", null] },    // Not null
                    { $ne: ["$travellingWith", ""] }       // Not empty string
                  ]
                },
                then: 1,
                else: 0
              }
            }
          },
          totalPricePaid: { 
            $sum: { 
              $ifNull: [{ $toDouble: "$currentTotalPrice" }, 0] 
            } 
          }, // Sum of currentTotalPrice for this destination
          totalTripPrice: { 
            $sum: { 
              $ifNull: [{ $toDouble: "$totalPrice" }, 0] 
            } 
          }, // Sum of totalPrice for this destination
          totalDiscount: { 
            $sum: { 
              $add: [
                { $toDouble: { $ifNull: ["$couponlessDiscount", 0] } }, 
                { $toDouble: { $ifNull: ["$generalDiscount", 0] } }
              ]
            } 
          }, // Sum of both couponlessDiscount and generalDiscount for this destination
          totalServiceFee: { 
            $sum: { 
              $ifNull: [{ $toDouble: "$serviceFee" }, 0] 
            } 
          }, // Sum of serviceFee for this destination
          totalTaxes: { 
            $sum: { 
              $ifNull: [{ $toDouble: "$tax" }, 0] 
            } 
          }, // Sum of tax for this destination
        }
      },
      {
        // Lookup for cities based on the destination name
        $lookup: {
          from: "cities", // The cities collection
          localField: "_id", // Match with the destination name
          foreignField: "country", // Match the country field in cities
          as: "destinationCities"
        }
      },
      {
        // Lookup for activities based on the cities
        $lookup: {
          from: "activities", // The activities collection
          localField: "destinationCities._id", // Match the city _id field from cities
          foreignField: "city", // Match the activities based on city ObjectId
          as: "activities"
        }
      },
      {
        // Add a field to count the number of cities and activities
        $addFields: {
          totalCities: { $size: "$destinationCities" }, // Count the number of cities in the destination
          totalActivities: { $size: "$activities" } // Count the total number of activities for the destination
        }
      },
      {
        // Lookup the destination details from the destinations collection
        $lookup: {
          from: "destinations", // Assuming you have a separate destinations collection
          localField: "_id", // Match by destination name
          foreignField: "name", // The field in the destinations collection holding the destination name
          as: "destinationDetails"
        }
      },
      {
        $unwind: "$destinationDetails" // Unwind the array to get destination details
      },
      {
        // Final projection to include required fields
        $project: {
          _id: 0,
          destinationName: "$_id", // The destination name
          totalItineraries: 1,
          groupedPackages: 1,
          totalCities: 1, // Count of cities
          totalActivities: 1, // Total activities based on the cities
          totalPricePaid: 1, // Sum of currentTotalPrice for all itineraries of the destination
          totalTripPrice: 1, // Sum of totalPrice for all itineraries of the destination
          totalDiscount: 1, // Sum of couponlessDiscount + generalDiscount
          totalServiceFee: 1, // Sum of serviceFee for all itineraries of the destination
          totalTaxes: 1, // Sum of taxes for all itineraries of the destination
        }
      }
    ]);

    if (!statistics.length) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'No destination statistics found', false));
    }

    return res.status(StatusCodes.OK).json(httpFormatter(statistics, 'Destination statistics retrieved successfully', true));
  } catch (error) {
    console.error('Error fetching destination statistics:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal Server Error', false));
  }
};

export const getActivityStatistics = async (req, res) => {
  try {
    const statistics = await Itinerary.aggregate([
      {
        // Unwind itineraries to access each city's activities individually
        $unwind: "$enrichedItinerary.itinerary"
      },
      {
        $unwind: "$enrichedItinerary.itinerary.days"
      },
      {
        $unwind: "$enrichedItinerary.itinerary.days.activities"
      },
      {
        // Lookup the GptActivity details
        $lookup: {
          from: "gptactivities", // assuming GptActivity collection
          localField: "enrichedItinerary.itinerary.days.activities",
          foreignField: "_id",
          as: "activityDetails"
        }
      },
      {
        $unwind: "$activityDetails" // Unwind activity details array
      },
      {
        $match: {
          "activityDetails.activityId": { $ne: null } // Ensure activity is present in Activities table
        }
      },
      {
        // Lookup activity details from the Activities collection using activityId from GptActivity
        $lookup: {
          from: "activities",
          localField: "activityDetails.activityId", // activityId in GptActivity
          foreignField: "_id", // matching with _id in Activities table
          as: "originalActivity"
        }
      },
      {
        $unwind: "$originalActivity" // Unwind original activity array
      },
      {
        // Group by original activityId to calculate stats per activity
        $group: {
          _id: "$originalActivity._id", // Group by original activity ID
          activityName: { $first: "$originalActivity.name" },
          destinationName: { $first: "$enrichedItinerary.destination" },
          cityName: { $first: "$enrichedItinerary.itinerary.currentCity" },
          totalActivityPrice: {
            $sum: {
              $multiply: [
                { $toDouble: "$originalActivity.price" }, // Multiply by price
                {
                  $cond: {
                    if: { $isArray: "$enrichedItinerary.itinerary.days.activities" }, // Check if activities is an array
                    then: { $size: "$enrichedItinerary.itinerary.days.activities" }, // Get the size if it's an array
                    else: 1 // Otherwise assume 1 (for a single object like ObjectId)
                  }
                }
              ]
            }
          },
          totalTripPrice: {
            $sum: {
              $toDouble: "$totalPrice"
            }
          },
          totalDiscount: {
            $sum: {
              $add: [
                { $toDouble: { $ifNull: ["$couponlessDiscount", 0] } },
                { $toDouble: { $ifNull: ["$generalDiscount", 0] } }
              ]
            }
          },
          totalServiceFee: {
            $sum: { $toDouble: "$serviceFee" }
          },
          totalTaxes: {
            $sum: { $toDouble: "$tax" }
          }
        }
      },
      {
        // Final projection of required fields
        $project: {
          _id: 0,
          activityName: 1,
          destinationName: 1,
          cityName: 1,
          totalActivityPrice: 1,
          totalTripPrice: 1,
          totalDiscount: 1,
          totalServiceFee: 1,
          totalTaxes: 1
        }
      }
    ]);

    console.log("successs1")
    if (!statistics.length) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'No activity statistics found', false));
    }

    return res.status(StatusCodes.OK).json(httpFormatter(statistics, 'Activity statistics retrieved successfully', true));
  } catch (error) {
    console.error('Error fetching activity statistics:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal Server Error', false));
  }
};

export const getAllItineraries = async (req, res) => {
  try {
    // Fetch all itineraries from the database and sort by 'createdBy'
    const itineraries = await Itinerary.find().populate('createdBy', 'firstName lastName').sort({ createdBy: 1 }); // 1 for ascending order

    if (!itineraries.length) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'No itineraries found', false));
    }

    return res.status(StatusCodes.OK).json(httpFormatter({ itineraries }, 'All itineraries retrieved successfully', true));
  } catch (error) {
    console.error('Error fetching all itineraries:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal Server Error', false));
  }
};



export const deleteItinerary = async (req, res) => {
  const { itineraryId } = req.params;

  try {
    // Find the itinerary by ID
    const itinerary = await Itinerary.findById(itineraryId);
    if (!itinerary) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Itinerary not found', false));
    }

    // Extract all GptActivity IDs from the itinerary
    const gptActivityIds = itinerary.enrichedItinerary.itinerary
      .flatMap(city => city.days)
      .flatMap(day => day.activities)
      .filter(Boolean);

    // Extract all Flight, Taxi, and Ferry IDs from the itinerary
    const flightIds = itinerary.enrichedItinerary.itinerary
      .flatMap(city => {
        return city.transport && city.transport.mode === "Flight"
          ? [city.transport.modeDetails] // Return flight ID if transport is a flight
          : []; // Return an empty array if not a flight
      })
      .filter(id => id !== null);

    const taxiIds = itinerary.enrichedItinerary.itinerary
      .flatMap(city => {
        return city.transport && city.transport.mode === "Car"
          ? [city.transport.modeDetails]
          : [];
      })
      .filter(id => id !== null);

    const ferryIds = itinerary.enrichedItinerary.itinerary
      .flatMap(city => {
        return city.transport && city.transport.mode === "Ferry"
          ? [city.transport.modeDetails]
          : [];
      })
      .filter(id => id !== null);

    // Delete all associated GptActivities, Flights, Taxis, and Ferries
    await GptActivity.deleteMany({ _id: { $in: gptActivityIds } });
    await Flight.deleteMany({ _id: { $in: flightIds } });
    await Taxi.deleteMany({ _id: { $in: taxiIds } });
    await Ferry.deleteMany({ _id: { $in: ferryIds } });

    // Delete the itinerary
    await Itinerary.findByIdAndDelete(itineraryId);

    return res.status(StatusCodes.OK).json(httpFormatter({}, 'Itinerary and associated data deleted successfully', true));
  } catch (error) {
    console.error('Error deleting itinerary and associated data:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal Server Error', false));
  }
};


export const getFullItineraryWithHistories = async (req, res) => {
  const { itineraryId } = req.params;

  try {
    // Fetch the itinerary by ID
    const itinerary = await Itinerary.findById(itineraryId);
    if (!itinerary) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Itinerary not found', false));
    }

    // Fetch all versions related to the specific itinerary ID
    const versions = await ItineraryVersion.find({ itineraryId }).sort({ version: -1 });

    // Combine itinerary and its versions
    const response = {
      itinerary,
      histories: versions
    };

    return res.status(StatusCodes.OK).json(httpFormatter(response, 'Itinerary and its histories retrieved successfully', true));
  } catch (error) {
    console.error('Error retrieving full itinerary with histories:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal Server Error', false));
  }
};


export const getItineraryHistories = async (req, res) => {
  const { itineraryId } = req.params;

  try {
    // Fetch the itinerary
    const itinerary = await Itinerary.findById(itineraryId).lean();
    if (!itinerary) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Itinerary not found', false));
    }

    // Fetch the associated histories
    const histories = await ItineraryVersion.find({ itineraryId }).lean();

    // Map through histories to fetch user names
    const historiesWithUsernames = await Promise.all(histories.map(async (history) => {
      const userId = history.changedBy?.userId; // Use optional chaining to safely access userId
      let userName = 'Unknown';

      if (userId) {
        const user = await User.findById(userId).select('name').lean();
        if (user) {
          userName = user.name; // User found, get the name
        } else {
          const employee = await Employee.findById(userId).select('name').lean();
          if (employee) {
            userName = employee.name; // Employee found, get the name
          }
        }
      }

      return {
        comment: history.comment,
        createdAt: history.createdAt,
        changedBy: userName, // Return the username
        historyId: history._id
      };
    }));

    // Return the itinerary and the modified histories
    return res.status(StatusCodes.OK).json({
      message: 'Itinerary and its histories retrieved successfully',
      data: {
        histories: historiesWithUsernames
      }
    });
  } catch (error) {
    console.error('Error retrieving itinerary histories:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal Server Error', false));
  }
};


export const replaceCityInItinerary = async (req, res) => {
  const { itineraryId, cityIndex } = req.params;
  const { newCity } = req.body;

  try {
    // Fetch the itinerary from the database
    const itinerary = await Itinerary.findById(itineraryId).lean();
    if (!itinerary) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Itinerary not found', false));
    }

    // Use values from the itinerary
    const { adults, children, childrenAges, rooms } = itinerary;
    const totalRooms = rooms.length;

    // Validate city index
    const parsedCityIndex = parseInt(cityIndex);
    if (parsedCityIndex < 0 || parsedCityIndex >= itinerary.enrichedItinerary.itinerary.length) {
      return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Invalid city index', false));
    }

    // Check if the new city is already in the itinerary
    const cityExists = itinerary.enrichedItinerary.itinerary.some(
      (city, index) => city.currentCity.toLowerCase() === newCity.toLowerCase() && index !== parsedCityIndex
    );

    if (cityExists) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(httpFormatter({}, `City '${newCity}' already exists in the itinerary`, false));
    }

    // Find the new city by name to get its ObjectId
    const newCityData = await City.findOne({ name: newCity }).lean();
    if (!newCityData) {
      return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, `City '${newCity}' not found in the database`, false));
    }

    const newCityId = newCityData._id;
    const oldCity = itinerary.enrichedItinerary.itinerary[parsedCityIndex];

    // Create a new city object for replacement, preserving the same number of days as the old city
    const newCityToAdd = {
      currentCity: newCity,
      nextCity: oldCity.nextCity,
      stayDays: oldCity.stayDays,
      transport: {
        mode: null,
        modeDetails: null,
      },
      days: [],
      hotelDetails: null, // Set hotelDetails to null for now
    };

    // If replacing the first city, add an arrival activity
    if (parsedCityIndex === 0) {
      const arrivalActivity = await GptActivity.create({
        name: `Arrival in ${newCity}`,
        startTime: '10:00 AM',
        endTime: '11:00 AM',
        duration: '1 hour',
        timeStamp: 'All day',
        category: 'Arrival',
        cityId: newCityId,
      });

      newCityToAdd.days.push({
        day: 1,
        date: '', // Date will be set later
        activities: [arrivalActivity._id],
      });
    }

    // Add leisure activities for each stay day, except the travel day
    for (let day of oldCity.days) {
      const newActivities = [];
      for (let activityId of day?.activities) {
        const activity = await GptActivity.findById(activityId);
        if (activity && activity.category === 'Travel') {
          // Keep the travel activity
          newActivities.push(activity._id);
        }else if(activity && activity.category === 'Arrival'){
          
        }
         else {
          // Replace other activities with leisure activities
          const leisureActivity = await GptActivity.create({
            name: 'Leisure',
            startTime: '10:00 AM',
            endTime: '5:00 PM',
            duration: '7 hours',
            timeStamp: 'All day',
            category: 'Leisure',
            cityId: newCityId,
          });
          newActivities.push(leisureActivity._id);
        }
      }

      // Add the new day to the days array of the new city if it has activities
      if (newActivities.length > 0) {
        newCityToAdd.days.push({
          day: day.day,
          date: day.date,
          activities: newActivities,
        });
      }
    }

    // Function to generate a travel activity and return its ID
    const generateTravelActivity = async (fromCity, toCity) => {
      const travelActivity = await GptActivity.create({
        name: `Travel from ${fromCity} to ${toCity}`,
        startTime: '09:00 AM',
        endTime: '12:00 PM',
        duration: '3 hours',
        timeStamp: 'Morning',
        category: 'Travel',
        cityId: (await City.findOne({ name: fromCity }))._id,
      });
      return travelActivity;
    };

    const addTravelActivity = async (fromCity, toCity, city, previousCity) => {
      const transportDetails = await generateTransportDetails({
        departureCity: fromCity,
        arrivalCity: toCity,
      });

      const travelActivity = await generateTravelActivity(fromCity, toCity);

      // Delete any existing travel activities for the city
      city.days[0].activities = await filterOutTravelActivities(city.days[0].activities);

      // Ensure city.transport is initialized
      if (!city.transport) {
        city.transport = { mode: null, modeDetails: null };
      }

      // Add the new travel activity
      previousCity.transport.mode = transportDetails.mode;
      previousCity.transport.modeDetails = travelActivity._id;

      city.days.unshift({
        day: 1,
        date: '', // Date will be set later
        activities: [travelActivity._id],
      });
    };

    if (parsedCityIndex === 0) {
      const nextCityIndex = 1;
      if (nextCityIndex < itinerary.enrichedItinerary.itinerary.length) {
        const nextCity = itinerary.enrichedItinerary.itinerary[nextCityIndex];

        const transportDetails = await generateTransportDetails({
          departureCity: newCity,
          arrivalCity: nextCity.currentCity,
        });

        const travelActivity = await generateTravelActivity(newCity, nextCity.currentCity);

        newCityToAdd.transport.mode = transportDetails.mode;
        newCityToAdd.transport.modeDetails = travelActivity._id;

        if (!nextCity.transport) {
          nextCity.transport = { mode: null, modeDetails: null };
        }

        nextCity.days[0].activities = await filterOutTravelActivities(nextCity.days[0].activities);
        nextCity.days = nextCity.days.filter(day => day.activities.length > 0);

        nextCity.days.unshift({
          day: 1,
          date: '', // Date will be set later
          activities: [travelActivity._id],
        });
      }
    } else if (parsedCityIndex === itinerary.enrichedItinerary.itinerary.length - 1) {
      const previousCity = itinerary.enrichedItinerary.itinerary[parsedCityIndex - 1];
      await addTravelActivity(previousCity.currentCity, newCity, newCityToAdd, previousCity);
    } else {
      const previousCity = itinerary.enrichedItinerary.itinerary[parsedCityIndex - 1];
      const nextCity = itinerary.enrichedItinerary.itinerary[parsedCityIndex + 1];

      nextCity.days[0].activities = await filterOutTravelActivities(nextCity.days[0].activities);
      nextCity.days = nextCity.days.filter(day => day.activities.length > 0);

      await addTravelActivity(previousCity.currentCity, newCity, newCityToAdd, previousCity);
      await addTravelActivity(newCity, nextCity.currentCity, nextCity, newCityToAdd);
    }

    async function filterOutTravelActivities(activityIds) {
      const filteredActivities = [];
      for (let activityId of activityIds) {
        const activity = await GptActivity.findById(activityId);
        if (activity && activity.category !== 'Travel' && activity.category !== 'Arrival') {
          filteredActivities.push(activityId);
        }
      }
      return filteredActivities;
    }

    itinerary.enrichedItinerary.itinerary[parsedCityIndex] = newCityToAdd;
    newCityToAdd.days = newCityToAdd.days.filter(day => day.activities.length > 0);

    const startDay = new Date(itinerary.enrichedItinerary.itinerary[0].days[0]?.date || new Date());
    const finalItinerary = addDatesToItinerary(itinerary.enrichedItinerary, startDay);

    const enrichedItinerary = await refetchFlightAndHotelDetails(
      { enrichedItinerary: finalItinerary },
      { adults, children, childrenAges, totalRooms }
    );

    await Itinerary.findByIdAndUpdate(
      itineraryId,
      { enrichedItinerary },
      {
        new: true,
        lean: true,
        changedBy: { userId: req.user.userId },
        comment: req.comment,
      }
    );

    res.status(StatusCodes.OK).json(httpFormatter({ enrichedItinerary }, 'City replaced successfully', true));
  } catch (error) {
    logger.error('Error replacing city in itinerary:', error);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(httpFormatter({}, 'Internal Server Error', false));
  }
};





export const getItineraryHistoryById = async (req, res) => {
  const { historyId } = req.params;

  try {
    // Fetch the specific itinerary version by history ID
    const itineraryHistory = await ItineraryVersion.findById(historyId).lean();
    if (!itineraryHistory) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'History not found', false));
    }

    // Retrieve the user information for the `changedBy` field
    const userId = itineraryHistory.changedBy?.userId;
    let userName = 'Unknown';

    if (userId) {
      const user = await User.findById(userId).select('name').lean();
      if (user) {
        userName = user.name;
      } else {
        const employee = await Employee.findById(userId).select('name').lean();
        if (employee) {
          userName = employee.name;
        }
      }
    }

    // Attach userName to the history object
    itineraryHistory.changedBy = {
      userId,
      userName,
    };

    return res.status(StatusCodes.OK).json(httpFormatter({ enrichedItinerary: itineraryHistory.enrichedItinerary }, 'Itinerary history retrieved successfully', true));
  } catch (error) {
    console.error('Error retrieving itinerary history:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal Server Error', false));
  }
};

export const addGeneralCoupon = async (req, res) => {
  try {
    const { itineraryId, discountId } = req.params;
    const userId = req.user.userId;
    const settings = await Settings.findOne();
    if (!settings) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Settings not found', false));
    }

    // Fetch the itinerary using the itineraryId
    const itinerary = await Itinerary.findById(itineraryId);
    if (!itinerary) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Itinerary not found', false));
    }

    // Fetch the discount using the discountId
    const discount = await Discount.findById(discountId);
    if (!discount) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Discount not found', false));
    }

    if(discount.discountType === 'general') {
      let response = 0;
      let beforeDiscount = parseFloat(itinerary.totalPrice) || 0; // Ensure it's a number

      // Ensure totalPrice, currentTotalPrice, and other fields are numbers
      let totalPrice = parseFloat(itinerary.totalPrice) || 0;
      let totalFlightsPrice = parseFloat(itinerary.totalFlightsPrice) || 0;
      let totalHotelsPrice = parseFloat(itinerary.totalHotelsPrice) || 0;
      let totalActivitiesPrice = parseFloat(itinerary.totalActivitiesPrice) || 0;
      let currentTotalPrice = parseFloat(itinerary.currentTotalPrice) || 0;
      let serviceFee = parseFloat(settings.serviceFee) || 0;

      // Handle discount on flights
      if (discount.applicableOn.flights === true) {
        response = await applyDiscountFunction({
          discountId: discountId,
          userId: userId,
          totalAmount: totalFlightsPrice
        });

        // Proper calculation of totalPrice
        totalPrice = parseFloat((totalPrice - totalFlightsPrice + (totalFlightsPrice - response.discountAmount)).toFixed(2));

        // Calculate the discount and taxes properly
        let disc = (parseFloat(itinerary.totalPrice) - totalPrice).toFixed(2);
        totalPrice = parseFloat(totalPrice)
        disc = parseFloat(disc)
        totalPrice+=disc;
        itinerary.tax = parseFloat((totalPrice * 0.18).toFixed(2)); // 18% tax
        itinerary.generalDiscount = disc;
        itinerary.totalPrice = parseFloat(totalPrice).toFixed(2); 
        const couponless = parseFloat(itinerary.couponlessDiscount)
        itinerary.currentTotalPrice = parseFloat((totalPrice * (1 + 0.18) + serviceFee - disc- couponless ).toFixed(2));

        if (!itinerary.discounts.includes(discountId)) {
          itinerary.discounts.push(discountId);
        }

        await itinerary.save();
        return res.status(StatusCodes.OK).json(httpFormatter({ itinerary }, 'Discount on flights applied successfully' , true));
      }

      // Handle discount on hotels
      else if (discount.applicableOn.hotels === true) {
        response = await applyDiscountFunction({
          discountId: discountId,
          userId: userId,
          totalAmount: totalHotelsPrice
        });

        totalPrice = parseFloat((totalPrice - totalHotelsPrice + (totalHotelsPrice - response.discountAmount)).toFixed(2));

        // Calculate the discount and taxes properly
        let disc = (parseFloat(itinerary.totalPrice) - totalPrice).toFixed(2);
        totalPrice = parseFloat(totalPrice)
        disc = parseFloat(disc)
        totalPrice+=disc;
        itinerary.tax = parseFloat((totalPrice * 0.18).toFixed(2)); // 18% tax
        itinerary.generalDiscount = disc;
        itinerary.totalPrice = parseFloat(totalPrice).toFixed(2); 
        const couponless = parseFloat(itinerary.couponlessDiscount)
        itinerary.currentTotalPrice = parseFloat((totalPrice * (1 + 0.18) + serviceFee - disc- couponless ).toFixed(2));

        if (!itinerary.discounts.includes(discountId)) {
          itinerary.discounts.push(discountId);
        }

        await itinerary.save();
        return res.status(StatusCodes.OK).json(httpFormatter({ itinerary }, 'Discount on hotels applied successfully' , true));
      }

      // Handle discount on activities
      else if (discount.applicableOn.activities === true) {
        response = await applyDiscountFunction({
          discountId: discountId,
          userId: userId,
          totalAmount: totalActivitiesPrice
        });

        totalPrice = parseFloat((totalPrice - totalActivitiesPrice + (totalActivitiesPrice - response.discountAmount)).toFixed(2));

        // Calculate the discount and taxes properly
        let disc = (parseFloat(itinerary.totalPrice) - totalPrice).toFixed(2);
        totalPrice = parseFloat(totalPrice)
        disc = parseFloat(disc)
        totalPrice+=disc;
        itinerary.tax = parseFloat((totalPrice * 0.18).toFixed(2)); // 18% tax
        itinerary.generalDiscount = disc;
        itinerary.totalPrice = parseFloat(totalPrice).toFixed(2); 
        const couponless = parseFloat(itinerary.couponlessDiscount)
        itinerary.currentTotalPrice = parseFloat((totalPrice * (1 + 0.18) + serviceFee - disc- couponless ).toFixed(2));

        if (!itinerary.discounts.includes(discountId)) {
          itinerary.discounts.push(discountId);
        }

        await itinerary.save();
        return res.status(StatusCodes.OK).json(httpFormatter({ itinerary }, 'Discount on activities applied successfully' , true));
      }

      // Handle discount on the entire package
      else if (discount.applicableOn.package === true) {
        response = await applyDiscountFunction({
          discountId: discountId,
          userId: userId,
          totalAmount: totalPrice
        });

        totalPrice = parseFloat((totalPrice - totalPrice + (totalPrice - response.discountAmount)).toFixed(2));

        // Calculate the discount and taxes properly
        let disc = (parseFloat(itinerary.totalPrice) - totalPrice).toFixed(2);
        totalPrice = parseFloat(totalPrice)
        disc = parseFloat(disc)
        totalPrice+=disc;
        itinerary.tax = parseFloat((totalPrice * 0.18).toFixed(2)); // 18% tax
        itinerary.generalDiscount = disc;
        itinerary.totalPrice = parseFloat(totalPrice).toFixed(2); 
        const couponless = parseFloat(itinerary.couponlessDiscount)
        itinerary.currentTotalPrice = parseFloat((totalPrice * (1 + 0.18) + serviceFee - disc - couponless ).toFixed(2));

        if (!itinerary.discounts.includes(discountId)) {
          itinerary.discounts.push(discountId);
        }

        await itinerary.save();
        return res.status(StatusCodes.OK).json(httpFormatter({ itinerary }, 'Discount on package applied successfully' , true));
      }
    }

    return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Discount not applicable', false));
  } catch (error) {
    console.error("Error applying discount:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal Server Error', false));
  }
};

export const updateStartDateInItinerary = async (req, res) => {
  const { itineraryId } = req.params;
  const { newStartDate } = req.body; // Get newStartDate from request body

  try {
    // Fetch the itinerary by ID
    const itinerary = await Itinerary.findById(itineraryId).lean();
    if (!itinerary) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Itinerary not found', false));
    }

    // Use values from the itinerary
    const { adults, children, childrenAges, rooms } = itinerary;
    const totalRooms = rooms.length;

    // Update the startDate of the itinerary
    itinerary.enrichedItinerary.startDate = newStartDate;

    // Update dates for the entire itinerary using addDatesToItinerary
    const updatedItineraryWithDates = addDatesToItinerary(itinerary.enrichedItinerary, newStartDate);

    // Refetch flight, taxi, ferry, and hotel details based on new dates
    const enrichedItineraryWithNewDetails = await refetchFlightAndHotelDetails(
      { enrichedItinerary: updatedItineraryWithDates },
      { adults, children, childrenAges, totalRooms }
    );

    // Save the updated itinerary with recalculated details
    await Itinerary.findByIdAndUpdate(
      itineraryId,
      { enrichedItinerary: enrichedItineraryWithNewDetails },
      {
        new: true,
        lean: true,
        changedBy: {
          userId: req.user.userId
        },
        comment: req.comment
      }
    );

    // Recalculate the total price after updating travel and accommodation details
    await calculateTotalPriceMiddleware(req, res, async () => {
      res.status(StatusCodes.OK).json(httpFormatter({ enrichedItinerary: enrichedItineraryWithNewDetails }, 'Start date updated and itinerary recalculated successfully', true));
    });

  } catch (error) {
    console.error('Error updating start date:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal Server Error', false));
  }
};


export const updateTravellingWithAndRoomsInItinerary = async (req, res) => {
  const { itineraryId } = req.params;
  const { travellingWith, rooms } = req.body;

  try {
    // Fetch the itinerary by ID
    const itinerary = await Itinerary.findById(itineraryId).lean();
    if (!itinerary) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Itinerary not found', false));
    }

    // Check if only rooms should be updated (i.e., `travellingWith` is not provided)
    if (travellingWith) {
      itinerary.travellingWith = travellingWith;
    }

    // Update the rooms if provided
    if (rooms) {
      itinerary.rooms = rooms;

      // Calculate updated counts for adults, children, and childrenAges based on the new rooms data
      let adults = 0;
      let children = 0;
      let childrenAges = [];

      rooms.forEach((room) => {
        adults += room.adults || 0;
        children += room.children || 0;
        if (room.childrenAges && Array.isArray(room.childrenAges)) {
          childrenAges = childrenAges.concat(room.childrenAges);
        }
      });

      // Use the total number of rooms for recalculations
      const totalRooms = rooms.length;

      // Refetch travel and accommodation details based on updated rooms and travellers
      const updatedItinerary = await refetchFlightAndHotelDetails(
        { enrichedItinerary: itinerary.enrichedItinerary },
        { adults, children, childrenAges, totalRooms }
      );

      // Save the updated itinerary, including changedBy for tracking purposes
      await Itinerary.findByIdAndUpdate(
        itineraryId,
        {
          enrichedItinerary: updatedItinerary,
          adults,
          children,
          childrenAges,
          rooms,
          ...(travellingWith ? { travellingWith } : {}) // Only update travellingWith if it was provided
        },
        {
          new: true,
          lean: true,
          changedBy: { userId: req.user.userId },
          comment: req.comment
        }
      );

      // Call the price calculation middleware to update the total price
      await calculateTotalPriceMiddleware(req, res, async () => {
        res.status(StatusCodes.OK).json(httpFormatter({ enrichedItinerary: updatedItinerary }, 'Travelling with and/or rooms updated successfully', true));
      });
    } else {
      res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Rooms information is required to update the itinerary.', false));
    }
  } catch (error) {
    console.error('Error updating travelling with and rooms:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal Server Error', false));
  }
};
