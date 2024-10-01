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
import { addHotelDetailsToItinerary } from '../../services/hotelDetails.js'; 
import { addTaxiDetailsToItinerary } from '../../services/taxiDetails.js';
import { addFerryDetailsToItinerary } from '../../../utils/dummyData.js'
import logger from '../../../config/logger.js';
import GptActivity from '../../models/gptactivity.js';
import Flight from '../../models/flight.js';
import Hotel from '../../models/hotel.js';
import Taxi from '../../models/taxi.js'
import {addDaysToCityService} from '../../services/itineraryService.js'
import { refetchFlightAndHotelDetails,deleteDaysFromCityService } from '../../services/itineraryService.js';
import Lead from '../../models/lead.js';  
import Notification from '../../models/notification.js'; 
import { getAdminsWithAccess, checkOwnershipOrAdminAccess } from '../../../utils/casbinService.js';
import Ferry from '../../models/ferry.js';
import mongoose from 'mongoose'

export const createItinerary = async (req, res) => {
  try {
    const userId = req.user.userId;

    const { startDate, rooms, adults, children, childrenAges, departureCity, arrivalCity, countryId, cities, activities, tripDuration } = req.body;

    // Check for required fields
    if (!startDate || !countryId || !departureCity || !arrivalCity || !childrenAges) {
      return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Missing or incorrect required fields in request body.', false));
    }

    // Find the country
    const country = await Destination.findById(countryId);
    if (!country) {
      return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Invalid country ID.', false));
    }

    // Ensure `cities` is always an array
    const cityIds = Array.isArray(cities) ? cities : [cities];

    // Find city and activity details
    const cityDetails = await City.find({ '_id': { $in: cityIds } });
    const activityDetails = await Activity.find({ '_id': { $in: activities } });

    if (!cityDetails.length) {
      return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'One or more cities are invalid.', false));
    }

    // Generate itinerary
    const result = await generateItinerary({
      ...req.body,
      country: country.name,
      cities: cityDetails.map(city => ({
        name: city.name,
        iataCode: city.iataCode,
        activities: activityDetails
          .filter(activity => activity.city?.toString() === city._id?.toString())
          .map(activity => ({
            name: activity.name,
            duration: activity.duration,
            category: activity.category,
            opensAt: activity.opensAt,
            closesAt: activity.closesAt
          }))
      }))
    });

    // Process itinerary details with travel and dates
    let itineraryWithTitles = {
      title: result.title,
      subtitle: result.subtitle,
      destination: country.name,
      itinerary: result.itinerary
    };
    console.log(itineraryWithTitles);
    // If there's more than one city, add transfer activities
    if (cityDetails.length > 1) {
      itineraryWithTitles = addTransferActivity(itineraryWithTitles);
    }

    // Add leisure activities if needed based on trip duration
    const [minTripDuration] = tripDuration.split('-').map(Number);
    let totalPlannedDays = itineraryWithTitles.itinerary.reduce((acc, city) => acc + city.days.length, 0);
    let remainingDays = minTripDuration - totalPlannedDays;

    if (remainingDays > 0) {
      // Distribute the remaining days across cities
      const citiesCount = itineraryWithTitles.itinerary.length;
      let cityIndex = 0;

      while (remainingDays > 0) {
        const currentCity = itineraryWithTitles.itinerary[cityIndex];
        const cityId = cityDetails.find(c => c.name === currentCity.currentCity)?._id;

        if (cityId) {
          const leisureActivity = await GptActivity.create({
            name: 'Leisure',
            startTime: '10:00 AM',
            endTime: '5:00 PM',
            duration: 'Full day',
            timeStamp: 'All day',
            category: 'Leisure',
            cityId: cityId,
          });
          const newDayIndex = currentCity.days.length + 1;

          currentCity.days.push({
            day: newDayIndex,
            date: '', // Date will be set later
            activities: [leisureActivity]
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
          const cityId = cityDetails.find(c => c.name === city.currentCity)?._id;
    
          // Add a check to see if the activity has a name property
          if (!activity.name) {
            logger.error(`Missing name in activity: ${JSON.stringify(activity)}`);
            continue; // Skip this activity if name is missing
          }
    
          if (cityId) {
            try {
              const newActivity = await GptActivity.create({
                name: activity.name,
                startTime: activity.startTime || '00:00',
                endTime: activity.endTime || '23:59',
                duration: activity.duration || 'Full day',
                timeStamp: activity.timeStamp || new Date().toISOString(),
                category: activity.category || 'General',
                cityId: cityId,
              });
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
      itineraryWithFlights = await addFlightDetailsToItinerary(itineraryWithTitles, adults, children, childrenAges, cityDetails);
      if (itineraryWithFlights.error) {
        return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, itineraryWithFlights.error, false));
      }
    }

    // Add taxi details if there are multiple cities
    let itineraryWithTaxi = itineraryWithFlights;
    if (cityDetails.length > 1) {
      itineraryWithTaxi = await addTaxiDetailsToItinerary(itineraryWithFlights);
    }

    // Add hotel details (even if it's a single city)
    const enrichedItinerary = await addHotelDetailsToItinerary(itineraryWithTaxi, adults, childrenAges, rooms);

    // Remove any invalid transport or hotel details
    enrichedItinerary.itinerary.forEach(city => {
      if (!city.transport || typeof city.transport !== 'object') {
        city.transport = null; // Ensure transport is either an object or null
      }

      if (!city.hotelDetails || !mongoose.isValidObjectId(city.hotelDetails)) {
        city.hotelDetails = null; // Ensure hotelDetails is either a valid ObjectId or null
      }
    });

    // Save the new itinerary
    const newItinerary = new Itinerary({
      createdBy: userId,
      enrichedItinerary: enrichedItinerary
    });
    await newItinerary.save();

    // Create the new lead
    const newLead = new Lead({
      createdBy: userId,
      itineraryId: newItinerary._id,
      status: 'ML',
      comments: []
    });
    await newLead.save();

    // Send notifications to admins with access
    const employeesWithAccess = await getAdminsWithAccess('GET', '/api/v1/leads');
    for (const employee of employeesWithAccess) {
      await Notification.create({
        employeeId: employee._id,
        leadId: newLead._id,
        message: `New lead generated !!`,
      });
    }

    // Return response
    return res.status(StatusCodes.OK).json(httpFormatter({ newItinerary, newLead }, 'Create Itinerary and Lead Successful'));
  } catch (error) {
    logger.error('Error creating itinerary or lead:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal Server Error', false));
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

    // Add new days to the city in the itinerary
    const updatedItinerary = await addDaysToCityService(itinerary, cityIndex, additionalDays);

    // Ensure enrichedItinerary exists before refetching details
    if (!updatedItinerary.enrichedItinerary) {
      return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Failed to update itinerary.', false));
    }

    // Refetch flight, taxi, and hotel details after adding days
    const itineraryWithNewDetails = await refetchFlightAndHotelDetails(updatedItinerary, req.body);
    
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
        comment: req.comment 
      }
    );

    // Send back the cleaned enrichedItinerary field
    res.status(StatusCodes.OK).json(httpFormatter({ enrichedItinerary: itineraryWithNewDetails }, 'Days added successfully', true));
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

    // Remove days from the city in the itinerary
    const updatedItinerary = await deleteDaysFromCityService(itinerary, cityIndex, daysToDelete);

    // Ensure enrichedItinerary exists before refetching details
    if (!updatedItinerary.enrichedItinerary) {
      return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Failed to update itinerary.', false));
    }

    // Refetch flight, taxi, and hotel details after deleting days
    const itineraryWithNewDetails = await refetchFlightAndHotelDetails(updatedItinerary, req.body);

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
        comment: req.comment 
      }
    );

    res.status(StatusCodes.OK).json(httpFormatter({ enrichedItinerary: itineraryWithNewDetails }, 'Days deleted successfully', true));
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, error.message, false));
  }
};


export const addCityToItinerary = async (req, res) => {
  const { itineraryId } = req.params;
  const { newCity, stayDays, transportMode, travelActivity } = req.body;

  try {
    // Fetch the itinerary
    const itinerary = await Itinerary.findById(itineraryId).lean();
    if (!itinerary) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Itinerary not found', false));
    }

    // Check if the user has ownership or admin access
    const hasAccess = await checkOwnershipOrAdminAccess(req.user.userId, itinerary.createdBy, 'PATCH', `/api/v1/itineraries/${itineraryId}`);
    if (!hasAccess) {
      return res.status(StatusCodes.FORBIDDEN).json(httpFormatter({}, 'Access denied', false));
    }

    // Check if the new city already exists in the itinerary
    const cityExists = itinerary.enrichedItinerary.itinerary.some(city => city.currentCity === newCity);
    if (cityExists) {
      return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'City already exists in the itinerary', false));
    }

    // Get the last city in the itinerary to update its nextCity and transport details
    const lastCityIndex = itinerary.enrichedItinerary.itinerary.length - 1;
    const lastCity = itinerary.enrichedItinerary.itinerary[lastCityIndex];

    if (lastCity) {
      // Update last city's transport mode to reflect travel to the new city
      lastCity.nextCity = newCity;
      lastCity.transport = {
        mode: transportMode || 'Transfer',
        modeDetails: null
      };
    }

    // Find the city data to add
    const cityData = await City.findOne({ name: newCity });
    if (!cityData) {
      return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, `City '${newCity}' not found in the database`, false));
    }

    const cityId = cityData._id;

    // Save the travel activity in the GptActivity collection
    const travelActivityDoc = await GptActivity.create({
      name: travelActivity || `Travel to ${newCity}`,
      type: 'Transfer',
      startTime: '09:00', // Default time for the activity
      endTime: '10:00',
      description: `Travel to ${newCity}`,
      cityId: cityId,
      timeStamp: new Date().toISOString()
    });

    // Create the new city object
    const cityToAdd = {
      currentCity: newCity,
      nextCity: null, // This is the last city, so nextCity is null
      stayDays: stayDays || 1, // Default stay is 1 day if not provided
      transport: {
        mode: null, // No transport yet for the new city
        modeDetails: null
      },
      transferCostPerPersonINR: null,
      transferDuration: null,
      days: [
        {
          day: 1, // Always start with day 1 for the new city
          date: new Date().toISOString().split('T')[0], // Assign today's date by default
          activities: [travelActivityDoc._id] // Save the activity ID in the itinerary
        }
      ],
      hotelDetails: null // No hotel by default
    };

    // Add the new city to the itinerary
    itinerary.enrichedItinerary.itinerary.push(cityToAdd);

    // Update dates for the entire itinerary
    const startDay = new Date(itinerary.enrichedItinerary.itinerary[0].days[0].date);
    const finalItinerary = addDatesToItinerary(itinerary.enrichedItinerary, startDay);

    // Refetch flight, transfer, and hotel details if needed
    const itineraryWithNewDetails = await refetchFlightAndHotelDetails({ enrichedItinerary: finalItinerary }, req.body);

    // Save the updated itinerary to the database, including 'changedBy' information
    await Itinerary.findByIdAndUpdate(
      itineraryId,
      { enrichedItinerary: itineraryWithNewDetails },
      {
        new: true,
        lean: true,
        changedBy: {
          userId: req.user.userId // Record the user who made the change
        },
        comment: req.comment 
      }
    );

    // Return the updated enriched itinerary
    res.status(StatusCodes.OK).json(httpFormatter({ enrichedItinerary: itineraryWithNewDetails }, 'City added successfully', true));
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, error.message, false));
  }
};



export const deleteCityFromItinerary = async (req, res) => {
  const { itineraryId, cityIndex } = req.params; // Get itinerary ID and city index from the params

  try {
    // Fetch the itinerary
    const itinerary = await Itinerary.findById(itineraryId).lean();
    if (!itinerary) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Itinerary not found', false));
    }

    // Check if the user has ownership or admin access
    const hasAccess = await checkOwnershipOrAdminAccess(req.user.userId, itinerary.createdBy, 'PATCH', `/api/v1/itineraries/${itineraryId}`);
    if (!hasAccess) {
      return res.status(StatusCodes.FORBIDDEN).json(httpFormatter({}, 'Access denied', false));
    }

    // Store the original start date before making changes
    const startDay = new Date(itinerary.enrichedItinerary.itinerary[0].days[0].date);

    // Check if the cityIndex is valid
    if (parseInt(cityIndex) >= itinerary.enrichedItinerary.itinerary.length) {
      return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Invalid city index', false));
    }

    // Remove the city to be deleted
    const cityToDelete = itinerary.enrichedItinerary.itinerary.splice(cityIndex, 1)[0];

    // Update the nextCity of the previous city, if applicable
    if (parseInt(cityIndex) > 0) {
      const previousCity = itinerary.enrichedItinerary.itinerary[cityIndex - 1];
      if (cityIndex < itinerary.enrichedItinerary.itinerary.length) {
        previousCity.nextCity = itinerary.enrichedItinerary.itinerary[cityIndex].currentCity;
      } else {
        previousCity.nextCity = null; // If the deleted city was the last one
      }

      // If the deleted city is now the last city, set transport mode to null
      if (cityIndex === itinerary.enrichedItinerary.itinerary.length) {
        previousCity.transport = {
          mode: null,
          modeDetails: null
        };
      }
    }

    // Refetch flight, taxi, and hotel details after deleting the city
    const updatedItinerary = itinerary.enrichedItinerary;
    const finalItinerary = addDatesToItinerary(updatedItinerary, startDay);
    const itineraryWithNewDetails = await refetchFlightAndHotelDetails({ enrichedItinerary: finalItinerary }, req.body);

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
        comment: req.comment 
      }
    );

    res.status(StatusCodes.OK).json(httpFormatter({ enrichedItinerary: itineraryWithNewDetails }, 'City deleted successfully', true));
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, error.message, false));
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

    // Fetch the new activity from the Activity table
    const newActivity = await Activity.findById(newActivityId);
    if (!newActivity) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'New activity not found' });
    }

    // Create the new activity in the GptActivity table
    const newGptActivity = await GptActivity.create({
      name: newActivity.name,
      startTime: newActivity.opensAt,
      endTime: newActivity.closesAt,
      duration: newActivity.duration,
      category: newActivity.category || 'General',
      cityId: newActivity.city,
      timeStamp: new Date().toISOString(),
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

    // Delete the old activity from GptActivity
    await GptActivity.findByIdAndDelete(oldActivityId);

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

    res.status(StatusCodes.OK).json({ message: 'Activity replaced successfully', data: itinerary });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error', error: error.message });
  }
};


export const replaceFlightInItinerary = async (req, res) => {
  const { itineraryId, modeDetailsId } = req.params; // Get itinerary and flight ID (oldFlightId)
  const { selectedFlight } = req.body; // New flight details from the frontend

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

    // Prepare baggageIncluded based on the presence of baggage details
    const baggageIncluded = selectedFlight.flightSegments.some(segment => segment.baggage && segment.baggage.length > 0);

    // Convert the baggage details to fit the schema structure
    const baggageDetails = {
      cabinBag: selectedFlight.flightSegments[0].baggage.find(bag => bag.type === 'carry_on')?.quantity || 0,
      checkedBag: selectedFlight.flightSegments[0].baggage.find(bag => bag.type === 'checked')?.quantity || 0,
    };

    // Create the new flight
    const newFlight = new Flight({
      departureCityId: selectedFlight.fromCityId,
      arrivalCityId: selectedFlight.toCityId,
      baggageIncluded: baggageIncluded,
      baggageDetails: baggageDetails,
      price: parseFloat(selectedFlight.priceInINR),
      currency: 'INR',
      airline: selectedFlight.airline,
      departureDate: new Date(selectedFlight.departureDate),
      flightSegments: selectedFlight.flightSegments.map(segment => ({
        departureTime: new Date(segment.departureTime),
        arrivalTime: new Date(segment.arrivalTime),
        flightNumber: segment.flightNumber, // Keep it as a string
      })),
    });

    // Save the new flight to the DB
    const savedFlight = await newFlight.save();

    // Replace the old flight in the itinerary with the new one
    let flightReplaced = false; // To track if the flight was replaced
    itinerary.enrichedItinerary.itinerary.forEach(city => {
      if (city.transport && city.transport.modeDetails.toString() === modeDetailsId) {
        city.transport.modeDetails = savedFlight._id;
        flightReplaced = true;
      }
    });

    if (!flightReplaced) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Old flight not found in itinerary', success: false });
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

    res.status(StatusCodes.OK).json({ message: 'Flight replaced successfully', data: itinerary });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error', error: error.message });
  }
};

export const replaceHotelInItinerary = async (req, res) => {
  const { itineraryId, hotelDetailsId } = req.params; // Get itinerary and old hotel ID (modeDetailsId)
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

    // Create the new hotel
    const newHotel = new Hotel({
      name: selectedHotel.name,
      address: selectedHotel.address,
      rating: selectedHotel.rating,
      price: parseFloat(selectedHotel.priceInINR), // Assuming price is converted to INR
      currency: 'INR',
      image: selectedHotel.image,
      cancellation: selectedHotel.cancellation,
      checkin: selectedHotel.checkin,
      checkout: selectedHotel.checkout,
      roomType: selectedHotel.roomType,
      refundable: selectedHotel.refundable,
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
        comment: req.comment 
      }
    );

    res.status(StatusCodes.OK).json({ message: 'Hotel replaced successfully', data: itinerary });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error', error: error.message });
  }
};

export const getTotalTripsByUsers = async (req, res) => {
  try {
    console.log("Fetching total trips for users..."); 

    const itinerariesCount = await Itinerary.aggregate([
      {
        $group: {
          _id: "$createdBy", 
          totalTrips: { $sum: 1 } 
        }
      }
    ]);

    console.log("Aggregated itineraries count:", itinerariesCount); 

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
