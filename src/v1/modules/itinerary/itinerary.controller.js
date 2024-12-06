import StatusCodes from 'http-status-codes';
import { generateItinerary } from '../../services/gpt.js';
import { addDatesToItinerary } from '../../../utils/dateUtils.js';
import { settransformItinerary } from '../../../utils/transformItinerary.js';
import { addFlightDetailsToItinerary, fetchFlightDetails } from '../../services/flightdetails.js';
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
import InternationalAirportCity from '../../models/internationalAirportCity.js';
import moment from 'moment';


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
    let internationalFlights = [];
    let internationalFlightsPrice = 0;

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
      destinationId: countryId,
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

    if (departureCity && arrivalCity) {
      const departureCityData = await InternationalAirportCity.findOne({ name: departureCity });
      const arrivalCityData = await InternationalAirportCity.findOne({ name: arrivalCity });
      const firstCityData = await City.findOne({ name: enrichedItinerary.itinerary[0]?.currentCity });
      const lastCityData = await City.findOne({ name: enrichedItinerary.itinerary.at(-1)?.currentCity });
    
      if (departureCityData && arrivalCityData && firstCityData && lastCityData) {
        const firstCityNearbyAirport = firstCityData.nearbyInternationalAirportCity;
        const lastCityNearbyAirport = lastCityData.nearbyInternationalAirportCity;
    
        const cityIATACodesToFirst = [
          { name: departureCity, iataCode: departureCityData.iataCode },
          { name: firstCityNearbyAirport.name, iataCode: firstCityNearbyAirport.iataCode },
        ];
    
        const cityIATACodesToArrival = [
          { name: lastCityNearbyAirport.name, iataCode: lastCityNearbyAirport.iataCode },
          { name: arrivalCity, iataCode: arrivalCityData.iataCode },
        ];
    
        const flightsToFirstNearby = await fetchFlightDetails(
          departureCity,
          firstCityNearbyAirport.name,
          startDate,
          adults,
          children,
          childrenAges,
          cityIATACodesToFirst
        );
    
        const lastCityEndDate = enrichedItinerary.itinerary.at(-1)?.days.at(-1)?.date;
        const nextTravelDate = moment(lastCityEndDate).add(1, 'days').format('YYYY-MM-DD');
    
        const flightsToArrival = await fetchFlightDetails(
          lastCityNearbyAirport.name,
          arrivalCity,
          nextTravelDate,
          adults,
          children,
          childrenAges,
          cityIATACodesToArrival
        );
    
        // Select the cheapest flights for both legs
        const cheapestFlightToFirstNearby =
          flightsToFirstNearby.length > 0
            ? flightsToFirstNearby.reduce((prev, curr) => (prev.price < curr.price ? prev : curr))
            : null;
    
        const cheapestFlightToArrival =
          flightsToArrival.length > 0
            ? flightsToArrival.reduce((prev, curr) => (prev.price < curr.price ? prev : curr))
            : null;
    
        // Add international flights to the itinerary
        if (cheapestFlightToFirstNearby) {
          const flightToFirstNearbyDetails = await new Flight({
            departureCityId: departureCityData._id,
            arrivalCityId: firstCityData._id,
            cityModelType: 'InternationalAirportCity',
            baggageIncluded: cheapestFlightToFirstNearby.flightSegments.some(
              (segment) => segment.baggage && segment.baggage.checkedBag !== 'N/A'
            ), // Check baggage inclusion
            baggageDetails: {
              cabinBag: cheapestFlightToFirstNearby.flightSegments[0]?.baggage?.cabinBag || 'N/A',
              checkedBag: cheapestFlightToFirstNearby.flightSegments[0]?.baggage?.checkedBag || 'N/A',
            },
            price: cheapestFlightToFirstNearby.price,
            currency: cheapestFlightToFirstNearby.currency || 'INR',
            airline: cheapestFlightToFirstNearby.airline,
            departureDate: cheapestFlightToFirstNearby.flightSegments[0]?.departureTime || null,
            flightSegments: cheapestFlightToFirstNearby.flightSegments.map((segment) => ({
              img: segment.img || null,
              departureTime: segment.departureTime,
              arrivalTime: segment.arrivalTime,
              flightNumber: segment.flightNumber.toString(),
            })),
          }).save();
    
          enrichedItinerary.itinerary[0].internationalTransport = flightToFirstNearbyDetails._id;
          internationalFlights.push(flightToFirstNearbyDetails._id);
          internationalFlightsPrice += cheapestFlightToFirstNearby.price;
        }
    
        if (cheapestFlightToArrival) {
          const flightToArrivalDetails = await new Flight({
            departureCityId: lastCityData._id,
            arrivalCityId: arrivalCityData._id,
            cityModelType: 'InternationalAirportCity',
            baggageIncluded: cheapestFlightToArrival.flightSegments.some(
              (segment) => segment.baggage && segment.baggage.checkedBag !== 'N/A'
            ), 
            baggageDetails: {
              cabinBag: cheapestFlightToArrival.flightSegments[0]?.baggage?.cabinBag || 'N/A',
              checkedBag: cheapestFlightToArrival.flightSegments[0]?.baggage?.checkedBag || 'N/A',
            },
            price: cheapestFlightToArrival.price,
            currency: cheapestFlightToArrival.currency || 'INR',
            airline: cheapestFlightToArrival.airline,
            departureDate: cheapestFlightToArrival.flightSegments[0]?.departureTime || null,
            flightSegments: cheapestFlightToArrival.flightSegments.map((segment) => ({
              img: segment.img || null,
              departureTime: segment.departureTime,
              arrivalTime: segment.arrivalTime,
              flightNumber: segment.flightNumber.toString(),
            })),
          }).save();
    
          enrichedItinerary.itinerary.at(-1).internationalTransport = flightToArrivalDetails._id;
          internationalFlights.push(flightToArrivalDetails._id);
          internationalFlightsPrice += cheapestFlightToArrival.price;
        }
      }
    }



    let totalPrice = 0;
    let priceWithoutCoupon = 0;
    let price = 0;
    let totalFlightsPrice = 0;
    let totalTaxisPrice = 0;
    let totalFerriesPrice = 0;
    let totalHotelsPrice = 0;
    let totalActivitiesPrice = 0;
    
    // Fetch settings
    const settings = await Settings.findOne();
    if (!settings) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Settings not found', false));
    }
    
    // Add international flights price first
    totalPrice += internationalFlightsPrice;
    priceWithoutCoupon += internationalFlightsPrice;
    
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
    
            // Apply discount if applicable (combine domestic flights with international flights)
            if (discount && discount.discountType !== null) {
              if (discount.discountType === 'couponless' && discount.applicableOn.flights === true) {
                let combinedFlightPrice = internationalFlightsPrice + transferPrice; // Combine international and domestic flights
                let response = await applyDiscountFunction({
                  discountId: discount._id,
                  userId: userId,
                  totalAmount: combinedFlightPrice
                });
    
                // Apply the discount to the transferPrice after combining with international flights
                transferPrice -= response.discountAmount ?? 0;
              }
            }
          }
        } 
    
        if (mode === 'Car') {
          modeDetails = await Taxi.findById(modeId);
          if (modeDetails && modeDetails.price) {
            transferPrice = parseFloat(modeDetails.price);
            totalTaxisPrice += transferPrice * (1 + settings.taxiMarkup / 100);
            price += transferPrice;
            // Apply taxi markup
            transferPrice += transferPrice * (settings.taxiMarkup / 100);
            transferPriceWithoutCoupon = transferPrice;
          }
        } 
    
        if (mode === 'Ferry') {
          modeDetails = await Ferry.findById(modeId);
          if (modeDetails && modeDetails.price) {
            transferPrice = parseFloat(modeDetails.price);
            totalFerriesPrice += transferPrice * (1 + settings.ferryMarkup / 100);
            price += transferPrice;
    
            // Apply ferry markup
            transferPrice += transferPrice * (settings.ferryMarkup / 100);
            transferPriceWithoutCoupon = transferPrice;
          }
        }
      }
    
      totalPrice += transferPrice;
      priceWithoutCoupon += transferPriceWithoutCoupon;
    }
        

    // Add hotel prices if available
    for (const city of enrichedItinerary.itinerary) {

      // Fetch hotel details from the hotel table if hotelDetails is an ObjectId
      let hotelPrice = 0;
      if (city.hotelDetails && typeof city.hotelDetails === 'object') {
        const hotel = await Hotel.findById(city.hotelDetails); // Assuming 'Hotel' is the model for the hotel table
        if (hotel && hotel.price) {
          hotelPrice = parseFloat(hotel.price) * rooms.length;
        }
      } else if (city.hotelDetails && city.hotelDetails.price) {
        hotelPrice = parseFloat(city.hotelDetails.price) * rooms.length;
      }

      if (hotelPrice > 0) {
        totalHotelsPrice += hotelPrice * (1 + settings.stayMarkup / 100);
        logger.info(`Added hotel cost for city ${city.currentCity}: ${hotelPrice}, Total Price Now: ${totalPrice}`);
        priceWithoutCoupon += hotelPrice + (hotelPrice * (settings.stayMarkup / 100));

        price += hotelPrice;
        if (discount && discount.discountType != null) {
          if (discount.discountType === 'couponless' && discount.applicableOn.hotels === true) {
            let response = await applyDiscountFunction({
              discountId: discount._id,
              userId: userId,
              totalAmount: hotelPrice,
            });
            hotelPrice -= response.discountAmount ?? 0;
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
    if (discount) {
      if (discount.discountType === 'couponless' && discount.applicableOn.activities === true) {
        let response = await applyDiscountFunction({
          discountId: discount._id,
          userId: userId,
          totalAmount: activityPrices
        });
        activityPrices -= response.discountAmount ?? 0;
      }
    }
    totalPrice += activityPrices
    priceWithoutCoupon += activityPricesWithoutCoupon.reduce((acc, price) => acc + price, 0);
    totalActivitiesPrice = activityPricesWithoutCoupon.reduce((acc, price) => acc + price, 0);
    priceWithoutCoupon += priceWithoutCoupon * (country.markup / 100);
    totalPrice += totalPrice * (country.markup / 100);

    if (discount && discount.discountType != null) {
      if (discount.discountType === 'couponless' && discount.applicableOn.package === true) {
        let response = await applyDiscountFunction({
          discountId: discount._id,
          userId: userId,
          totalAmount: totalPrice
        });
        totalPrice -= response.discountAmount ?? 0;
      }
    }
    // Apply the destination's markup to the total price


    let grandTotal = priceWithoutCoupon;
    const disc = grandTotal - totalPrice;
    totalPrice += disc
    // Calculate and add 18% tax
    const taxAmount = grandTotal * 0.18; // 18% tax
    const tax = totalPrice * 0.18;

    grandTotal += taxAmount;

    // Add service fee
    grandTotal += settings.serviceFee;
    grandTotal -= disc;

    const serviceFee = settings.serviceFee;

    // Convert totalPrice to a string
    // Save the new itinerary with totalPrice as a string
    const newItinerary = new Itinerary({
      createdBy: userId,
      enrichedItinerary: {
        ...enrichedItinerary,
        destinationId: countryId,
        departureCity: departureCity, 
        arrivalCity: arrivalCity,     
      },
      adults: adults,
      children: children,
      childrenAges: childrenAges,
      rooms: rooms,
      travellingWith: travellingWith,
      totalPrice: totalPrice.toFixed(2),
      grandTotal: grandTotal.toFixed(2),
      totalPriceWithoutMarkup: price.toFixed(2),
      couponlessDiscount: disc.toFixed(2),
      totalFlightsPrice: totalFlightsPrice.toFixed(2),
      totalHotelsPrice: totalHotelsPrice.toFixed(2),
      totalFerriesPrice: totalFerriesPrice.toFixed(2),
      totalTaxisPrice: totalTaxisPrice.toFixed(2),
      totalActivitiesPrice: totalActivitiesPrice.toFixed(2),
      internationalTotalFlightsPrice: internationalFlightsPrice.toFixed(2), 
      internationalFlights: internationalFlights,
      discounts: discount ? [discount._id] : [],
      tax: tax.toFixed(2),
      serviceFee: serviceFee.toFixed(2)
    });
    await newItinerary.save();

    const sanitizedItinerary = {
      ...newItinerary.toObject(),
      totalTaxisPrice: undefined,
      totalFerriesPrice: undefined,
    };


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
          { sanitizedItinerary, newLead, totalPersons },
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

    const itinerary = await Itinerary.findById(itineraryId);
    if (!itinerary) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Itinerary not found', false));
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastFetchedDate = itinerary.lastFetchedDate || new Date(0);

    if (lastFetchedDate >= today) {
      // Remove unnecessary fields from the response before returning
      const sanitizedItinerary = itinerary.toObject();
      delete sanitizedItinerary.totalHotelsPrice;
      delete sanitizedItinerary.totalFlightsPrice;
      delete sanitizedItinerary.internationalTotalFlightsPrice;
      delete sanitizedItinerary.totalTaxisPrice;
      delete sanitizedItinerary.totalFerriesPrice;

      return res
        .status(StatusCodes.OK)
        .json(httpFormatter({ itinerary: sanitizedItinerary }, 'Itinerary details retrieved successfully', true));
    }

    const { adults, children, childrenAges, rooms } = itinerary;
    const totalRooms = rooms.length;

    const updatedItineraryWithDetails = await refetchFlightAndHotelDetails(
      { itinerary },
      { adults, children, childrenAges, totalRooms }
    );

    updatedItineraryWithDetails.lastFetchedDate = new Date();

    // Remove unnecessary fields from the response
    const sanitizedItinerary = updatedItineraryWithDetails.toObject();
    delete sanitizedItinerary.totalHotelsPrice;
    delete sanitizedItinerary.totalFlightsPrice;
    delete sanitizedItinerary.internationalTotalFlightsPrice;
    delete sanitizedItinerary.totalTaxisPrice;
    delete sanitizedItinerary.totalFerriesPrice;

    // Save the itinerary with the updated lastFetchedDate
    await itinerary.save();

    // Send the sanitized itinerary in the response
    const itineraryWithCalculatedPrices = await calculateTotalPriceMiddleware(req, res);

    res.status(StatusCodes.OK).json(httpFormatter({ itinerary: itineraryWithCalculatedPrices }, 'Itinerary details and price updated successfully', true));

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

    const hasAccess = await checkOwnershipOrAdminAccess(req.user.userId, itinerary.createdBy, 'GET', `/api/v1/itinerary/${itineraryId}/flights`);
    if (!hasAccess) {
      return res.status(StatusCodes.FORBIDDEN).json(httpFormatter({}, 'Access denied', false));
    }

    // Extract flight IDs from the itinerary's enriched itinerary (cities)
    const cityFlightIds = itinerary.enrichedItinerary.itinerary
      .flatMap(city => {
        return city.transport && city.transport.mode === "Flight"
          ? [city.transport.modeDetails] // Return flight ID if transport is a flight
          : []; // Return an empty array if not a flight
      })
      .filter(id => id !== null); // Filter out any null values

    // Get international flight IDs from the itinerary
    const internationalFlightIds = itinerary.internationalFlights || [];

    // Combine both city flights and international flights into one array
    const allFlightIds = [...cityFlightIds, ...internationalFlightIds];

    // Fetch flight details from the Flight collection for all flight IDs
    const flights = await Flight.find({ _id: { $in: allFlightIds } });

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

    const hasAccess = await checkOwnershipOrAdminAccess(req.user.userId, itinerary.createdBy, 'GET', `/api/v1/itinerary/${itineraryId}/hotels`);
    if (!hasAccess) {
      return res.status(StatusCodes.FORBIDDEN).json(httpFormatter({}, 'Access denied', false));
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

    const hasAccess = await checkOwnershipOrAdminAccess(req.user.userId, itinerary.createdBy, 'GET', `/api/v1/itinerary/${itineraryId}/transfer`);
    if (!hasAccess) {
      return res.status(StatusCodes.FORBIDDEN).json(httpFormatter({}, 'Access denied', false));
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
    const itinerary = await Itinerary.findById(itineraryId);
    if (!itinerary) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Itinerary not found', false));
    }
    
    const hasAccess = await checkOwnershipOrAdminAccess(req.user.userId, itinerary.createdBy, 'GET', `/api/v1/itinerary/${itineraryId}/activities`);
    if (!hasAccess) {
      return res.status(StatusCodes.FORBIDDEN).json(httpFormatter({}, 'Access denied', false));
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
    const hasAccess = await checkOwnershipOrAdminAccess(req.user.userId, itinerary.createdBy, 'PATCH', `/api/v1/itinerary/${itineraryId}`);
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

    itinerary.enrichedItinerary = finalItinerary;

    // Refetch flight, taxi, and hotel details after adding days
    const itineraryWithNewDetails = await refetchFlightAndHotelDetails(
      { itinerary },
      { adults, children, childrenAges, totalRooms }
    );

    const updatedItinerary = await Itinerary.findByIdAndUpdate(
      itineraryId,
      {
        ...itineraryWithNewDetails, 
        comment: req.comment, // Include the comment if provided
        changedBy: { userId: req.user.userId }, // Track who made the change
      },
      { new: true }
    );
    
    let leanedItinerary = updatedItinerary.toObject();

    const sanitizedItinerary = {
      ...leanedItinerary,
      totalHotelsPrice: undefined,
      totalFlightsPrice: undefined,
      internationalTotalFlightsPrice: undefined,
      totalTaxisPrice: undefined,
      totalFerriesPrice: undefined,
    };

    const itineraryWithCalculatedPrices = await calculateTotalPriceMiddleware(req, res);

    res.status(StatusCodes.OK).json(httpFormatter({ itinerary: itineraryWithCalculatedPrices }, 'Days added and price updated successfully', true));
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
    const hasAccess = await checkOwnershipOrAdminAccess(req.user.userId, itinerary.createdBy, 'PATCH', `/api/v1/itinerary/${itineraryId}`);
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

    itinerary.enrichedItinerary = finalItinerary;
    // Refetch flight, taxi, and hotel details after deleting days
    const itineraryWithNewDetails = await refetchFlightAndHotelDetails(
      { itinerary },
      { adults, children, childrenAges, totalRooms }
    );

    const updatedItinerary = await Itinerary.findByIdAndUpdate(
      itineraryId,
      {
        ...itineraryWithNewDetails, 
        comment: req.comment, // Include the comment if provided
        changedBy: { userId: req.user.userId }, // Track who made the change
      },
      { new: true }
    );
    
    let leanedItinerary = updatedItinerary.toObject();

    const sanitizedItinerary = {
      ...leanedItinerary,
      totalHotelsPrice: undefined,
      totalFlightsPrice: undefined,
      internationalTotalFlightsPrice: undefined,
      totalTaxisPrice: undefined,
      totalFerriesPrice: undefined,
    };
    // Send back the cleaned enrichedItinerary field
    const itineraryWithCalculatedPrices = await calculateTotalPriceMiddleware(req, res);

    res.status(StatusCodes.OK).json(httpFormatter({ itinerary: itineraryWithCalculatedPrices }, 'Days deleted and price updated successfully', true));
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
    const startDay = new Date(itinerary.enrichedItinerary.itinerary[0]?.days[0]?.date || new Date());

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
        if (activity && activity.category !== 'Travel' && activity.category !== 'Arrival') {
          filteredActivities.push(activityId);
        }
      }
      return filteredActivities;
    }

    // Remove any days with no activities
    itinerary.enrichedItinerary.itinerary.forEach((city) => {
      city.days = city.days.filter(day => day.activities.length > 0);
    });

  
    const finalItinerary = addDatesToItinerary(itinerary.enrichedItinerary, startDay);

    itinerary.enrichedItinerary = finalItinerary;

    // Pass the full itinerary object for refetching
    const itineraryWithNewDetails = await refetchFlightAndHotelDetails(
      itinerary, // Pass the entire itinerary here
      { adults, children, childrenAges, totalRooms }
    );


    // Refetch flight, taxi, and hotel details for all cities
    const updatedItinerary = await Itinerary.findByIdAndUpdate(
      itineraryId,
      {
        ...itineraryWithNewDetails,
        comment: req.comment,
        changedBy: { userId: req.user.userId },
      },
      { new: true }
    );

    const sanitizedItinerary = {
      ...updatedItinerary.toObject(),
      totalHotelsPrice: undefined,
      totalFlightsPrice: undefined,
      internationalTotalFlightsPrice: undefined,
      totalTaxisPrice: undefined,
      totalFerriesPrice: undefined,
    };


    const itineraryWithCalculatedPrices = await calculateTotalPriceMiddleware(req, res);

    res.status(StatusCodes.OK).json(httpFormatter({ itinerary: itineraryWithCalculatedPrices }, 'City added and price updated successfully', true));
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
    itinerary.enrichedItinerary = finalItinerary;

    // Pass the full itinerary object for refetching
    const itineraryWithNewDetails = await refetchFlightAndHotelDetails(
      itinerary, // Pass the entire itinerary here
      { adults, children, childrenAges, totalRooms }
    );


    // Refetch flight, taxi, and hotel details for all cities
    const updatedItinerary = await Itinerary.findByIdAndUpdate(
      itineraryId,
      {
        ...itineraryWithNewDetails,
        comment: req.comment,
        changedBy: { userId: req.user.userId },
      },
      { new: true }
    );

    const sanitizedItinerary = {
      ...updatedItinerary.toObject(),
      totalHotelsPrice: undefined,
      totalFlightsPrice: undefined,
      internationalTotalFlightsPrice: undefined,
      totalTaxisPrice: undefined,
      totalFerriesPrice: undefined,
    };

    const itineraryWithCalculatedPrices = await calculateTotalPriceMiddleware(req, res);

    res.status(StatusCodes.OK).json(httpFormatter({ itinerary: itineraryWithCalculatedPrices }, 'City deleted and price updated successfully', true));
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
    const hasAccess = await checkOwnershipOrAdminAccess(req.user.userId, itinerary.createdBy, 'PATCH', `/api/v1/itinerary/${itineraryId}`);
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

    // Recalculate dates for the entire itinerary
    const startDay = new Date(itinerary.enrichedItinerary.itinerary[0].days[0].date);
    const finalItinerary = addDatesToItinerary(itinerary.enrichedItinerary, startDay);
    itinerary.enrichedItinerary = finalItinerary;

    // Pass the full itinerary object for refetching
    const { adults, children, childrenAges, rooms } = itinerary;
    const totalRooms = rooms.length;

    // Refetch flight, hotel, taxi, and other details
    const itineraryWithNewDetails = await refetchFlightAndHotelDetails(
      itinerary, // Pass the entire itinerary here
      { adults, children, childrenAges, totalRooms }
    );

    // Update the itinerary with new details
    const updatedItinerary = await Itinerary.findByIdAndUpdate(
      itineraryId,
      {
        ...itineraryWithNewDetails,
        comment: req.comment,
        changedBy: { userId: req.user.userId },
      },
      { new: true }
    );

    const sanitizedItinerary = {
      ...updatedItinerary.toObject(),
      totalHotelsPrice: undefined,
      totalFlightsPrice: undefined,
      internationalTotalFlightsPrice: undefined,
      totalTaxisPrice: undefined,
      totalFerriesPrice: undefined,
    };


    // Call the price calculation middleware
    const itineraryWithCalculatedPrices = await calculateTotalPriceMiddleware(req, res);

    res.status(StatusCodes.OK).json(httpFormatter({ itinerary: itineraryWithCalculatedPrices }, 'Activity replaced and price updated successfully', true));

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
    const hasAccess = await checkOwnershipOrAdminAccess(req.user.userId, itinerary.createdBy, 'PATCH', `/api/v1/itinerary/${itineraryId}`);
    if (!hasAccess) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: 'Access denied' });
    }

    // Fetch the old activity from the GptActivity table
    const oldGptActivity = await GptActivity.findById(oldActivityId);
    if (!oldGptActivity) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Old activity not found' });
    }

    // Create a new leisure activity if the old one doesn't exist
    const newGptActivity_id = await createLeisureActivityIfNotExist(oldGptActivity.cityId);

    // Replace the old activity in the itinerary with the new GptActivity ID
    let activityReplaced = false;
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

    // Refetch flight and hotel details after the activity replacement
    const { adults, children, childrenAges, rooms } = itinerary;
    const totalRooms = rooms.length;
    
    // Pass the full itinerary (not just enrichedItinerary)
    const itineraryWithNewDetails = await refetchFlightAndHotelDetails(
      itinerary, // Pass the entire itinerary object here
      { adults, children, childrenAges, totalRooms }
    );

    // Save the updated itinerary with new details
    const updatedItinerary = await Itinerary.findByIdAndUpdate(
      itineraryId,
      {
        ...itineraryWithNewDetails,
        comment: req.comment,
        changedBy: { userId: req.user.userId },
      },
      { new: true }
    );


    // Sanitize the itinerary before sending it in the response
    const sanitizedItinerary = {
      ...updatedItinerary.toObject(),
      totalHotelsPrice: undefined,
      totalFlightsPrice: undefined,
      internationalTotalFlightsPrice: undefined,
      totalTaxisPrice: undefined,
      totalFerriesPrice: undefined,
    };


    // Call the price calculation middleware and send the response
    const itineraryWithCalculatedPrices = await calculateTotalPriceMiddleware(req, res);

    res.status(StatusCodes.OK).json(httpFormatter({ itinerary: itineraryWithCalculatedPrices }, 'Activity deleted and price updated successfully', true));

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
    const totalRooms = rooms.length;

    // Check if the user has ownership or admin access
    const hasAccess = await checkOwnershipOrAdminAccess(req.user.userId, itinerary.createdBy, 'PATCH', `/api/v1/itinerary/${itineraryId}`);
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


     const itineraryWithNewDetails = await refetchFlightAndHotelDetails(
      itinerary, // Pass the entire itinerary object here
      { adults, children, childrenAges, totalRooms }
    );

    // Save the updated itinerary with new details
    const updatedItinerary = await Itinerary.findByIdAndUpdate(
      itineraryId,
      {
        ...itineraryWithNewDetails,
        comment: req.comment,
        changedBy: { userId: req.user.userId },
      },
      { new: true }
    );


    const sanitizedItinerary = {
      ...updatedItinerary.toObject(),
      totalHotelsPrice: undefined,
      totalFlightsPrice: undefined,
      internationalTotalFlightsPrice: undefined,
      totalTaxisPrice: undefined,
      totalFerriesPrice: undefined,
    };

    // Call middleware to calculate the total price
    const itineraryWithCalculatedPrices = await calculateTotalPriceMiddleware(req, res);

    res.status(StatusCodes.OK).json(httpFormatter({ itinerary: itineraryWithCalculatedPrices }, 'Transport mode changed and price updated successfully', true));
    
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error', error: error.message });
  }
};

export const replaceFlightInItinerary = async (req, res) => {
  const { itineraryId, modeDetailsId } = req.params;
  const { selectedFlight } = req.body;

  let departureCity, arrivalCity;
  let departureCityName, arrivalCityName;

  try {
    const fromCity = selectedFlight.fromCity; // Using fromCity from selectedFlight
    const toCity = selectedFlight.toCity;    // Using toCity from selectedFlight

    // Check if it's an international flight
    const isInternationalFlight = await InternationalAirportCity.exists({ name: fromCity }) ||
                                  await InternationalAirportCity.exists({ name: toCity });

    if (isInternationalFlight) {
      // Handle departure city
      if (await InternationalAirportCity.exists({ name: fromCity })) {
        departureCity = await InternationalAirportCity.findOne({ name: fromCity });
      } else {
        const domesticCity = await City.findOne({ name: fromCity });
        departureCityName = domesticCity?.nearbyInternationalAirportCity?.name || fromCity;
      }

      // Handle arrival city
      if (await InternationalAirportCity.exists({ name: toCity })) {
        arrivalCity = await InternationalAirportCity.findOne({ name: toCity });
      } else {
        const domesticCity = await City.findOne({ name: toCity });
        arrivalCityName = domesticCity?.nearbyInternationalAirportCity?.name || toCity;
      }
    } else {
      // Handle domestic flights (just use City model)
      departureCity = await City.findOne({ name: fromCity });
      arrivalCity = await City.findOne({ name: toCity });
    }

    if (!departureCity && !departureCityName || !arrivalCity && !arrivalCityName) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'City not found', false));
    }

    const itinerary = await Itinerary.findById(itineraryId);
    if (!itinerary) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Itinerary not found', false));
    }

    const hasAccess = await checkOwnershipOrAdminAccess(
      req.user.userId,
      itinerary.createdBy,
      'PATCH',
      `/api/v1/itinerary/${itineraryId}/flight/${modeDetailsId}/replace`
    );
    if (!hasAccess) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: 'Access denied' });
    }

    // Extract baggage details from selectedFlight
    const baggageIncluded = selectedFlight.baggageDetails.some(bag => bag.quantity && parseInt(bag.quantity.replace(/\D/g, '')) > 0);
    const baggageDetails = {
      cabinBag: selectedFlight.baggageDetails.find(bag => bag.type === 'Cabin Bag')?.quantity || 'N/A',
      checkedBag: selectedFlight.baggageDetails.find(bag => bag.type === 'Checked Bag')?.quantity || 'N/A',
    };

    // Create a new flight
    const newFlight = new Flight({
      departureCityId: departureCity ? departureCity._id : null,
      arrivalCityId: arrivalCity ? arrivalCity._id : null,
      departureCityName: departureCityName || fromCity, // Use fromCity if no name found in DB
      arrivalCityName: arrivalCityName || toCity,       // Use toCity if no name found in DB
      baggageIncluded: baggageIncluded,
      baggageDetails: baggageDetails,
      price: parseFloat(selectedFlight.price.replace(/[^0-9.-]+/g, '')) || 0, // Parse price from selectedFlight
      currency: 'INR',
      airline: selectedFlight.airline,
      departureDate: new Date(selectedFlight.departureDate),
      flightSegments: selectedFlight.stopDetails.map(segment => ({
        img: segment.img || null,
        departureTime: new Date(`${selectedFlight.departureDate} ${selectedFlight.departureTime}`),
        arrivalTime: new Date(`${selectedFlight.arrivalDate} ${segment.arrivalTime}`),
        flightNumber: segment.flightNumber || 'N/A',
      })),
    });

    // Save the new flight
    const savedFlight = await newFlight.save();

    let flightReplaced = false;

    // Replace the flight in the itinerary
    itinerary.enrichedItinerary.itinerary.forEach(city => {
      if (city.transport && city.transport.modeDetails && city.transport.modeDetails.toString() === modeDetailsId) {
        city.transport.modeDetails = savedFlight._id;
        flightReplaced = true;
      }
    });

    itinerary.internationalFlights.forEach((flightId, index) => {
      if (flightId.toString() === modeDetailsId) {
        itinerary.internationalFlights[index] = savedFlight._id;
        flightReplaced = true;
      }
    });

    if (!flightReplaced) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Flight not found in itinerary', false));
    }

    await Itinerary.findByIdAndUpdate(
      itineraryId,
      { ...itinerary },
      {
        new: true,
        lean: true,
        changedBy: { userId: req.user.userId },
        comment: req.comment,
      }
    );

    const sanitizedItinerary = {
      ...itinerary.toObject(),
      totalHotelsPrice: undefined,
      totalFlightsPrice: undefined,
      internationalTotalFlightsPrice: undefined,
      totalTaxisPrice: undefined,
      totalFerriesPrice: undefined,
    };

    const itineraryWithCalculatedPrices = await calculateTotalPriceMiddleware(req, res);

    return res.status(StatusCodes.OK).json({
      message: "Flight replaced successfully",
      data: itineraryWithCalculatedPrices,
    });
  } catch (error) {
    console.error('Error replacing flight:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
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
    const hasAccess = await checkOwnershipOrAdminAccess(req.user.userId, itinerary.createdBy, 'PATCH', `/api/v1/itinerary/${itineraryId}`);
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

    const sanitizedItinerary = {
      ...itinerary,
      totalHotelsPrice: undefined,
      totalFlightsPrice: undefined,
      internationalTotalFlightsPrice: undefined,
      totalTaxisPrice: undefined,
      totalFerriesPrice: undefined,
    };

    const itineraryWithCalculatedPrices = await calculateTotalPriceMiddleware(req, res);

    res.status(StatusCodes.OK).json(httpFormatter({ itinerary: itineraryWithCalculatedPrices }, 'Hotel replaced and price updated successfully', true));
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
          totalPricePaid: { $sum: { $ifNull: [{ $toDouble: "$grandTotal" }, 0] } },
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
              $ifNull: [{ $toDouble: "$grandTotal" }, 0]
            }
          }, // Sum of grandTotal for this destination
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
          totalPricePaid: 1, // Sum of grandTotal for all itineraries of the destination
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
        } else if (activity && activity.category === 'Arrival') {

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

    itinerary.enrichedItinerary = finalItinerary;

    const itineraryWithNewDetails = await refetchFlightAndHotelDetails(
      itinerary, // Pass the entire itinerary object here
      { adults, children, childrenAges, totalRooms }
    );

    // Save the updated itinerary with new details
    const updatedItinerary = await Itinerary.findByIdAndUpdate(
      itineraryId,
      {
        ...itineraryWithNewDetails,
        comment: req.comment,
        changedBy: { userId: req.user.userId },
      },
      { new: true }
    );


    const sanitizedItinerary = {
      ...updatedItinerary.toObject(),
      totalHotelsPrice: undefined,
      totalFlightsPrice: undefined,
      internationalTotalFlightsPrice: undefined,
      totalTaxisPrice: undefined,
      totalFerriesPrice: undefined,
    };

    const itineraryWithCalculatedPrices = await calculateTotalPriceMiddleware(req, res);

    res.status(StatusCodes.OK).json(httpFormatter({ itinerary: itineraryWithCalculatedPrices }, 'City replaced and price updated successfully', true));

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

    if (discount.discountType === 'general') {
      let response = 0;
      let beforeDiscount = parseFloat(itinerary.totalPrice) || 0; // Ensure it's a number

      // Ensure totalPrice, grandTotal, and other fields are numbers
      let totalPrice = parseFloat(itinerary.totalPrice) || 0;
      let totalFlightsPrice = parseFloat(itinerary.totalFlightsPrice) || 0;
      let totalHotelsPrice = parseFloat(itinerary.totalHotelsPrice) || 0;
      let totalActivitiesPrice = parseFloat(itinerary.totalActivitiesPrice) || 0;
      let grandTotal = parseFloat(itinerary.grandTotal) || 0;
      let serviceFee = parseFloat(settings.serviceFee) || 0;

      // Handle discount on flights
      if (discount.applicableOn.flights === true) {
        response = await applyDiscountFunction({
          discountId: discountId,
          userId: userId,
          totalAmount: totalFlightsPrice
        });

        // Proper calculation of totalPrice
        totalPrice = parseFloat((totalPrice - totalFlightsPrice + (totalFlightsPrice - response.discountAmount ?? 0)).toFixed(2));

        // Calculate the discount and taxes properly
        let disc = (parseFloat(itinerary.totalPrice) - totalPrice).toFixed(2);
        totalPrice = parseFloat(totalPrice)
        disc = parseFloat(disc)
        totalPrice += disc;
        itinerary.tax = parseFloat((totalPrice * 0.18).toFixed(2)); // 18% tax
        itinerary.generalDiscount = disc;
        itinerary.totalPrice = parseFloat(totalPrice).toFixed(2);
        const couponless = parseFloat(itinerary.couponlessDiscount)
        itinerary.grandTotal = parseFloat((totalPrice * (1 + 0.18) + serviceFee - disc - couponless).toFixed(2));

        if (!itinerary.discounts.includes(discountId)) {
          itinerary.discounts.push(discountId);
        }

        await itinerary.save();
        return res.status(StatusCodes.OK).json(httpFormatter({ itinerary }, 'Discount on flights applied successfully', true));
      }

      // Handle discount on hotels
      else if (discount.applicableOn.hotels === true) {
        response = await applyDiscountFunction({
          discountId: discountId,
          userId: userId,
          totalAmount: totalHotelsPrice
        });

        totalPrice = parseFloat((totalPrice - totalHotelsPrice + (totalHotelsPrice - response.discountAmount ?? 0)).toFixed(2));

        // Calculate the discount and taxes properly
        let disc = (parseFloat(itinerary.totalPrice) - totalPrice).toFixed(2);
        totalPrice = parseFloat(totalPrice)
        disc = parseFloat(disc)
        totalPrice += disc;
        itinerary.tax = parseFloat((totalPrice * 0.18).toFixed(2)); // 18% tax
        itinerary.generalDiscount = disc;
        itinerary.totalPrice = parseFloat(totalPrice).toFixed(2);
        const couponless = parseFloat(itinerary.couponlessDiscount)
        itinerary.grandTotal = parseFloat((totalPrice * (1 + 0.18) + serviceFee - disc - couponless).toFixed(2));

        if (!itinerary.discounts.includes(discountId)) {
          itinerary.discounts.push(discountId);
        }

        await itinerary.save();
        return res.status(StatusCodes.OK).json(httpFormatter({ itinerary }, 'Discount on hotels applied successfully', true));
      }

      // Handle discount on activities
      else if (discount.applicableOn.activities === true) {
        response = await applyDiscountFunction({
          discountId: discountId,
          userId: userId,
          totalAmount: totalActivitiesPrice
        });

        totalPrice = parseFloat((totalPrice - totalActivitiesPrice + (totalActivitiesPrice - response.discountAmount ?? 0)).toFixed(2));

        // Calculate the discount and taxes properly
        let disc = (parseFloat(itinerary.totalPrice) - totalPrice).toFixed(2);
        totalPrice = parseFloat(totalPrice)
        disc = parseFloat(disc)
        totalPrice += disc;
        itinerary.tax = parseFloat((totalPrice * 0.18).toFixed(2)); // 18% tax
        itinerary.generalDiscount = disc;
        itinerary.totalPrice = parseFloat(totalPrice).toFixed(2);
        const couponless = parseFloat(itinerary.couponlessDiscount)
        itinerary.grandTotal = parseFloat((totalPrice * (1 + 0.18) + serviceFee - disc - couponless).toFixed(2));

        if (!itinerary.discounts.includes(discountId)) {
          itinerary.discounts.push(discountId);
        }

        await itinerary.save();
        return res.status(StatusCodes.OK).json(httpFormatter({ itinerary }, 'Discount on activities applied successfully', true));
      }

      // Handle discount on the entire package
      else if (discount.applicableOn.package === true) {
        response = await applyDiscountFunction({
          discountId: discountId,
          userId: userId,
          totalAmount: totalPrice
        });

        totalPrice = parseFloat((totalPrice - totalPrice + (totalPrice - response.discountAmount ?? 0)).toFixed(2));

        // Calculate the discount and taxes properly
        let disc = (parseFloat(itinerary.totalPrice) - totalPrice).toFixed(2);
        totalPrice = parseFloat(totalPrice)
        disc = parseFloat(disc)
        totalPrice += disc;
        itinerary.tax = parseFloat((totalPrice * 0.18).toFixed(2)); // 18% tax
        itinerary.generalDiscount = disc;
        itinerary.totalPrice = parseFloat(totalPrice).toFixed(2);
        const couponless = parseFloat(itinerary.couponlessDiscount)
        itinerary.grandTotal = parseFloat((totalPrice * (1 + 0.18) + serviceFee - disc - couponless).toFixed(2));

        if (!itinerary.discounts.includes(discountId)) {
          itinerary.discounts.push(discountId);
        }

        await itinerary.save();
        return res.status(StatusCodes.OK).json(httpFormatter({ itinerary }, 'Discount on package applied successfully', true));
      }
    }

    return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Discount not applicable', false));
  } catch (error) {
    console.error("Error applying discount:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal Server Error', false));
  }
};

export const updateItineraryDetails = async (req, res) => {
  const { itineraryId } = req.params;
  const { newStartDate, travellingWith, rooms } = req.body;

  try {
    // Fetch the itinerary by ID
    const itinerary = await Itinerary.findById(itineraryId).lean();
    if (!itinerary) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Itinerary not found', false));
    }

    let { enrichedItinerary, adults, children, childrenAges } = itinerary;
    let totalRooms = itinerary.rooms.length;

    // Flag to track if the enriched itinerary needs updates
    let enrichedItineraryNeedsUpdate = false;

    // Update startDate if provided
    if (newStartDate) {
      enrichedItinerary.startDate = newStartDate;
      enrichedItinerary = addDatesToItinerary(enrichedItinerary, newStartDate);
      enrichedItineraryNeedsUpdate = true; // Mark for refetching details
    }

    // Update travellingWith and rooms if provided
    if (rooms) {
      itinerary.rooms = rooms;

      // Recalculate counts for adults, children, and childrenAges based on the updated rooms
      adults = 0;
      children = 0;
      childrenAges = [];
      rooms.forEach((room) => {
        adults += room.adults || 0;
        children += room.children || 0;
        if (room.childrenAges && Array.isArray(room.childrenAges)) {
          childrenAges = childrenAges.concat(room.childrenAges);
        }
      });

      totalRooms = rooms.length;
      enrichedItineraryNeedsUpdate = true; // Mark for refetching details
    }

    if (travellingWith) {
      itinerary.travellingWith = travellingWith;
    }

    itinerary.enrichedItinerary = enrichedItinerary;
    
    let finalItinerary;
    // Refetch travel and accommodation details if necessary
    if (enrichedItineraryNeedsUpdate) {
       finalItinerary = await refetchFlightAndHotelDetails(
        { itinerary },
        { adults, children, childrenAges, totalRooms }
      );
    }


    // Save the updated itinerary, including tracking details
    const updatedItinerary = await Itinerary.findByIdAndUpdate(
      itineraryId,
      {
        ...finalItinerary,
        comment: req.comment,
        changedBy: { userId: req.user.userId },
      },
      { new: true }
    );


    const sanitizedItinerary = {
      ...updatedItinerary.toObject(),
      totalHotelsPrice: undefined,
      totalFlightsPrice: undefined,
      internationalTotalFlightsPrice: undefined,
      totalTaxisPrice: undefined,
      totalFerriesPrice: undefined,
    };

    // Recalculate the total price after all updates
    const itineraryWithCalculatedPrices = await calculateTotalPriceMiddleware(req, res);

    res.status(StatusCodes.OK).json(httpFormatter({ itinerary: itineraryWithCalculatedPrices }, 'Itinerary and price updated successfully', true));
  } catch (error) {
    console.error('Error updating itinerary details:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal Server Error', false));
  }
};


