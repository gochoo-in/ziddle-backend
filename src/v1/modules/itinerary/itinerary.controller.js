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
import {addDaysToCityService} from '../../services/itineraryService.js'
import { refetchFlightAndHotelDetails,deleteDaysFromCityService } from '../../services/itineraryService.js';
import Lead from '../../models/lead.js';  
import Notification from '../../models/notification.js'; 
import { getAdminsWithAccess, checkOwnershipOrAdminAccess } from '../../../utils/casbinService.js';
import Ferry from '../../models/ferry.js';
import mongoose from 'mongoose'
import Employee from '../../models/employee.js';
import User from '../../models/user.js';
import { generateTransportDetails } from '../../services/gptTransfer.js';

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

    // Assuming enrichedItinerary contains a destination name, find its corresponding destination ID
    const destinationName = itinerary.enrichedItinerary?.destination;

    let destinationId = null;
    if (destinationName) {
      const destination = await Destination.findOne({ name: destinationName });
      if (destination) {
        destinationId = destination._id; // Assuming Destination model has an '_id' field representing the destinationId
      }
    }

    console.log("destinationId",destinationId)

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


export const addCityToItineraryAtPosition = async (req, res) => {
  const { itineraryId } = req.params;
  const { newCity, stayDays, position, adults, children, childrenAges } = req.body;

  try {

    // Validation for required fields
    if (adults == null || children == null || !Array.isArray(childrenAges)) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(httpFormatter({}, 'Missing required fields: adults, children, or childrenAges', false));
    }

    // Fetch the itinerary
    const itinerary = await Itinerary.findById(itineraryId).lean();
    if (!itinerary) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(httpFormatter({}, 'Itinerary not found', false));
    }

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

    // Generate the new city object without travel details (as it is the starting point)
    const cityToAdd = {
      currentCity: newCity,
      nextCity: null,
      stayDays: stayDays || 1,
      transport: {
        mode: null,
        modeDetails: null,
      },
      days: [],
      hotelDetails: null,
    };

    // Add leisure activities for each stay day in the new city, starting from day 2
    
    for (let dayIndex = 2; dayIndex <= (stayDays || 1) + 1; dayIndex++) {
      const leisureActivity = await GptActivity.create({
        name: 'Leisure',
        startTime: '10:00 AM',
        endTime: '5:00 PM',
        duration: 'Full day',
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

    const addTravelActivity = async (fromCity, toCity, city,previousCity) => {
      if (!city) {
        throw new Error('City object is null or undefined when trying to add travel activity.');
      }
     

      // Generate transport details using OpenAI
      const transportDetails = await generateTransportDetails({
        departureCity: fromCity,
        arrivalCity: toCity,
      });
      
      const travelActivity = await generateTravelActivity(fromCity, toCity);

      // Set transport details for the city
      previousCity.transport.mode = transportDetails.mode;
      previousCity.transport.modeDetails = travelActivity._id;

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
      await addTravelActivity(previousCity.currentCity, newCity, cityToAdd,previousCity);
    } else {
      // If added in the middle
      
      const previousCity = itinerary.enrichedItinerary.itinerary[position - 1];
      const nextCity = itinerary.enrichedItinerary.itinerary[position + 1];

      // Remove existing travel activity from the next city
      nextCity.days[0].activities = await filterOutTravelActivities(nextCity.days[0].activities);
      

      // Add travel activity to the new city from the previous city
      await addTravelActivity(previousCity.currentCity, newCity, cityToAdd,previousCity);

      // Add travel activity from new city to next city
      await addTravelActivity(newCity, nextCity.currentCity, nextCity,cityToAdd);
    }

    // Helper function to filter out travel activities from the list of activities
    async function filterOutTravelActivities(activityIds) {
     
      const filteredActivities = [];
      for (let activityId of activityIds) {
        const activity = await GptActivity.findById(activityId);
        if (activity && activity.category !== 'Travel') {
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
   

    // Refetch flight, taxi, and hotel details
    const enrichedItinerary = await refetchFlightAndHotelDetails(
      { enrichedItinerary: finalItinerary },
      { adults, children, childrenAges }
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

    res.status(StatusCodes.OK).json(httpFormatter({ enrichedItinerary }, 'City added successfully', true));
  } catch (error) {
    console.error('Error adding city to itinerary:', error);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(httpFormatter({}, 'Internal Server Error', false));
  }
};


export const deleteCityFromItinerary = async (req, res) => {
  const { itineraryId, cityIndex } = req.params;
  const { adults, children, childrenAges } = req.body;
  try {
    // Fetch the itinerary
    const itinerary = await Itinerary.findById(itineraryId);
    if (!itinerary) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Itinerary not found', false));
    }

    // Check user access
    const hasAccess = await checkOwnershipOrAdminAccess(req.user.userId, itinerary.createdBy, 'PATCH', `/api/v1/itineraries/${itineraryId}`);
    if (!hasAccess) {
      return res.status(StatusCodes.FORBIDDEN).json(httpFormatter({}, 'Access denied', false));
    }

    // Validate city index
    const parsedCityIndex = parseInt(cityIndex);
    if (parsedCityIndex >= itinerary.enrichedItinerary.itinerary.length) {
      return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Invalid city index', false));
    }

    // Store the original start date
    const startDay = new Date(itinerary.enrichedItinerary.itinerary[0].days[0].date);

    // Remove the city to be deleted
    const cityToDelete = itinerary.enrichedItinerary.itinerary.splice(parsedCityIndex, 1)[0];

    // If no cities are left, clear the itinerary and update it
    if (itinerary.enrichedItinerary.itinerary.length === 0) {
      itinerary.enrichedItinerary.itinerary = [];
    } else if (parsedCityIndex === 0) {
      // If deleting the first city
      const newFirstCity = itinerary.enrichedItinerary.itinerary[0];
      if (newFirstCity.days[0] && newFirstCity.days[0].activities.length > 0) {
        const oldTravelActivityId = newFirstCity.days[0].activities.shift();
        await GptActivity.findByIdAndDelete(oldTravelActivityId);

        // Remove the day if no activities left
        if (newFirstCity.days[0].activities.length === 0) {
          newFirstCity.days.shift();
        }
      }
      if (newFirstCity.transport && newFirstCity.transport.mode) {
        // Ensure transport details are retained since it connects to the next city
        // Only reset if no valid transport exists
        if (!newFirstCity.nextCity) {
            newFirstCity.transport = {
                mode: null,
                modeDetails: null,
            };
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
        await GptActivity.findByIdAndDelete(oldTravelActivityId);

        // Remove the day if no activities left
        if (nextCity.days[0].activities.length === 0) {
          nextCity.days.shift();
        }
      }

      // Create new travel activity between previous and next city
      const previousCityDetails = await City.findOne({ name: previousCity.currentCity });
      if (!previousCityDetails) {
        return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Previous city details not found', false));
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
        // Shift all existing days and update their day numbers accordingly
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

    // Recalculate dates and save changes
    const updatedItinerary = itinerary.enrichedItinerary;
    const finalItinerary = addDatesToItinerary(updatedItinerary, startDay);
    const enrichedItinerary = await refetchFlightAndHotelDetails(
      { enrichedItinerary: finalItinerary },
      { adults, children, childrenAges }
    );
    await Itinerary.findByIdAndUpdate(
      itineraryId,
      { enrichedItinerary},
      {
        new: true,
        lean: true,
        changedBy: { userId: req.user.userId },
        comment: req.comment,
      }
    );

    res.status(StatusCodes.OK).json(httpFormatter({ enrichedItinerary }, 'City deleted successfully', true));
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


  const departureCity = await City.findOne({ name: selectedFlight.segments[0].from });
  const arrivalCity = await City.findOne({ name: selectedFlight.segments[0].to });

  if (!departureCity || !arrivalCity) {
    return res.status(404).json({ message: 'City not found' });
  }


  console.log("details from frontend",itineraryId,modeDetailsId,selectedFlight)
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
      return res.status(404).json({ message: 'Old flight not found in itinerary', success: false });
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

    res.status(StatusCodes.OK).json({ message: 'Hotel replaced successfully', data: updatedItinerary });
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
        changedBy: userName // Return the username
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
  const { newCity, adults, children, childrenAges } = req.body;

  try {
    // Fetch the itinerary from the database
    const itinerary = await Itinerary.findById(itineraryId).lean();
    if (!itinerary) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Itinerary not found', false));
    }

    // Validate city index
    const parsedCityIndex = parseInt(cityIndex);
    if (parsedCityIndex < 0 || parsedCityIndex >= itinerary.enrichedItinerary.itinerary.length) {
      return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Invalid city index', false));
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

    // Add leisure activities for each stay day, except the travel day
    for (let day of oldCity.days) {
      const newActivities = [];
      for (let activityId of day.activities) {
        const activity = await GptActivity.findById(activityId);
        if (activity && activity.category === 'Travel') {
          // Keep the travel activity
          newActivities.push(activity._id);
        } else {
          // Replace other activities with leisure activities
          const leisureActivity = await GptActivity.create({
            name: 'Leisure',
            startTime: '10:00 AM',
            endTime: '5:00 PM',
            duration: 'Full day',
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

    const addTravelActivity = async (fromCity, toCity, city,previousCity) => {
      // Generate transport details using OpenAI
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

      // Add travel activity to the first day of the city's itinerary
      city.days.unshift({
        day: 1,
        date: '', // Date will be set later
        activities: [travelActivity._id],
      });
    };

    if (parsedCityIndex === 0) {
      // Case 1: Replacing the first city
      const nextCityIndex = 1;
      if (nextCityIndex < itinerary.enrichedItinerary.itinerary.length) {
        const nextCity = itinerary.enrichedItinerary.itinerary[nextCityIndex];

        // Generate transport details for the new city to the next city
        const transportDetails = await generateTransportDetails({
          departureCity: newCity,
          arrivalCity: nextCity.currentCity,
        });

        const travelActivity = await generateTravelActivity(newCity, nextCity.currentCity);

        // Set transport details in the new city
        newCityToAdd.transport.mode = transportDetails.mode;
        newCityToAdd.transport.modeDetails = travelActivity._id;

        // Ensure nextCity.transport is initialized
        if (!nextCity.transport) {
          nextCity.transport = { mode: null, modeDetails: null };
        }

        // Delete any existing travel activities for the next city
        nextCity.days[0].activities = await filterOutTravelActivities(nextCity.days[0].activities);

        // Remove days without activities in nextCity
        nextCity.days = nextCity.days.filter(day => day.activities.length > 0);

        // Set transport details for the next city and add the new travel activity
        // nextCity.transport.mode = transportDetails.mode;
        // nextCity.transport.modeDetails = travelActivity._id;

        // Add the travel activity to the first day of the next city
        nextCity.days.unshift({
          day: 1,
          date: '', // Date will be set later
          activities: [travelActivity._id],
        });
      }
    } else if (parsedCityIndex === itinerary.enrichedItinerary.itinerary.length - 1) {
      // Case 3: Replacing the last city
      const previousCity = itinerary.enrichedItinerary.itinerary[parsedCityIndex - 1];
      await addTravelActivity(previousCity.currentCity, newCity, newCityToAdd,previousCity);
    } else {
      // Case 2: Replacing a middle city
      const previousCity = itinerary.enrichedItinerary.itinerary[parsedCityIndex - 1];
      const nextCity = itinerary.enrichedItinerary.itinerary[parsedCityIndex + 1];

      // Remove existing travel activity from the next city
      nextCity.days[0].activities = await filterOutTravelActivities(nextCity.days[0].activities);

      // Remove days without activities in nextCity
      nextCity.days = nextCity.days.filter(day => day.activities.length > 0);

      // Add travel activity to the new city from the previous city
      await addTravelActivity(previousCity.currentCity, newCity, newCityToAdd,previousCity);

      // Add travel activity from the new city to the next city
      await addTravelActivity(newCity, nextCity.currentCity, nextCity,newCityToAdd);
    }

    // Helper function to filter out travel activities from the list of activities
    async function filterOutTravelActivities(activityIds) {
      const filteredActivities = [];
      for (let activityId of activityIds) {
        const activity = await GptActivity.findById(activityId);
        if (activity && activity.category !== 'Travel') {
          filteredActivities.push(activityId);
        } else if (activity && activity.category === 'Travel') {
          // Delete old travel activity
          await GptActivity.findByIdAndDelete(activityId);
        }
      }
      return filteredActivities;
    }

    // Replace the old city with the new city in the itinerary
    itinerary.enrichedItinerary.itinerary[parsedCityIndex] = newCityToAdd;

    // Remove days with no activities from the new city
    newCityToAdd.days = newCityToAdd.days.filter(day => day.activities.length > 0);

    // Update dates for the entire itinerary
    const startDay = new Date(itinerary.enrichedItinerary.itinerary[0].days[0]?.date || new Date());
    const finalItinerary = addDatesToItinerary(itinerary.enrichedItinerary, startDay);

    // Refetch flight, taxi, and hotel details
    const enrichedItinerary = await refetchFlightAndHotelDetails(
      { enrichedItinerary: finalItinerary },
      { adults, children, childrenAges }
    );

    // Save the updated itinerary using findByIdAndUpdate
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