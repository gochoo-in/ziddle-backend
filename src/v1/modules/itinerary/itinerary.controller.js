import StatusCodes from 'http-status-codes';
import { verifyToken } from '../../../utils/token.js'; // Import your token verification utility
import { generateItinerary } from '../../services/gpt.js';
import { addDatesToItinerary } from '../../../utils/dateUtils.js';
import { settransformItinerary } from '../../../utils/transformItinerary.js';
import { addFlightDetailsToItinerary } from '../../services/flightdetails.js';
import { addTransferActivity } from '../../../utils/travelItinerary.js';
import httpFormatter from '../../../utils/formatter.js';
import Destination from '../../models/destination.js'; 
import City from '../../models/city.js';
import Activity from '../../models/activity.js';
import Itinerary from '../../models/itinerary.js';
import { addHotelDetailsToItinerary } from '../../services/hotelDetails.js'; 
import { addTaxiDetailsToItinerary } from '../../services/taxiDetails.js';
import logger from '../../../config/logger.js';
import GptActivity from '../../models/gptactivity.js';
import Flight from '../../models/flight.js';
import Hotel from '../../models/hotel.js';
import Taxi from '../../models/taxi.js'
export const createItinerary = async (req, res) => {
  try {
    // Verify the user token
      const userId = req.user.userId; // Extract user ID from the token

      const { startDate, rooms, adults, children, childrenAges, departureCity, arrivalCity, countryId, cities, activities } = req.body;

      if (!startDate || !countryId || !departureCity || !arrivalCity || !childrenAges) {
        return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Missing or incorrect required fields in request body.', false));
      }

      const country = await Destination.findById(countryId);
      if (!country) {
        return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Invalid country ID.', false));
      }

      const cityDetails = await City.find({ '_id': { $in: cities } });
      const activityDetails = await Activity.find({ '_id': { $in: activities } });

      if (!cityDetails.length || !activityDetails.length) {
        return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'One or more city or activity IDs are invalid.', false));
      }

      const result = await generateItinerary({
        ...req.body,
        country: country.name,
        cities: cityDetails.map(city => ({
          name: city.name,
          iataCode: city.iataCode,
          activities: activityDetails
            .filter(activity => activity.city.toString() === city._id.toString())
            .map(activity => ({
              name: activity.name,
              duration: activity.duration,
              category: activity.category,
              opensAt: activity.opensAt,
              closesAt: activity.closesAt
            }))
        }))
      });

      const itineraryWithTitles = {
        title: result.title,
        subtitle: result.subtitle,
        itinerary: result.itinerary
      };

      const itineraryWithTravel = addTransferActivity(itineraryWithTitles);
      const itineraryWithDates = addDatesToItinerary(itineraryWithTravel, startDate);
      const transformItinerary = settransformItinerary(itineraryWithDates);

      const itineraryWithFlights = await addFlightDetailsToItinerary(transformItinerary, adults, children, childrenAges, cityDetails);

      if (itineraryWithFlights.error) {
        return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, itineraryWithFlights.error, false));
      }

      for (const city of itineraryWithFlights.itinerary) {
        for (const day of city.days) {
          const activityIds = [];
          for (const activity of day.activities) {
            const newActivity = await GptActivity.create({
              name: activity.name,
              startTime: activity.startTime,
              endTime: activity.endTime,
              duration: activity.duration,
              timeStamp: activity.timeStamp,
              category: activity.category,
              cityId: cityDetails.find(c => c.name === city.currentCity)._id,
            });
            activityIds.push(newActivity._id);
          }
          day.activities = activityIds;
        }
      }

      const itineraryWithTaxi = await addTaxiDetailsToItinerary(itineraryWithFlights);

      for (const city of itineraryWithTaxi.itinerary) {
        if (city.transport) {
          city.transport.modeDetailsModel = city.transport.mode === "Flight" ? "Flight" : "Taxi";
        }
      }

      const enrichedItinerary = await addHotelDetailsToItinerary(itineraryWithTaxi, adults, childrenAges, rooms);

      // Create new itinerary document
      const newItinerary = new Itinerary({
        createdBy: userId, // Add createdBy field
        enrichedItinerary: enrichedItinerary
      });

      await newItinerary.save();

      return res.status(StatusCodes.OK).json(httpFormatter({ enrichedItinerary }, 'Create Itinerary Successful'));
  } catch (error) {
    logger.error('Error creating itinerary:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal Server Error', false));
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

      console.log(flightIds);
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
        if (transport && (transport.mode === "Taxi" || transport.mode === "Ferry")) {
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
      .filter(transfer => transfer.mode === "Taxi")
      .map(transfer => transfer.modeDetails);

    const ferryIds = transfers
      .filter(transfer => transfer.mode === "Ferry")
      .map(transfer => transfer.modeDetails);

    const [taxis, ferries] = await Promise.all([
      Taxi.find({ _id: { $in: taxiIds } }),
      // Ferry.find({ _id: { $in: ferryIds } }),
    ]);

    // Prepare the response with direct details
    const transferDetails = transfers.map(transfer => {
      let details = null;
      if (transfer.mode === "Taxi") {
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