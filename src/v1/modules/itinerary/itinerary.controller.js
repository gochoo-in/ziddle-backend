import StatusCodes from 'http-status-codes';
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

export const createItinerary = async (req, res) => {
  try {
    const { startDate, adults, children, childrenAges, departureCity, arrivalCity, countryId, cities, activities } = req.body;
    if (!startDate || !countryId || !departureCity || !arrivalCity || !childrenAges ) {
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

    // Include childrenAges, departureCity, and arrivalCity in the flight details
    const itineraryWithFlights = await addFlightDetailsToItinerary(transformItinerary, adults, children, childrenAges, cityDetails);

    if (itineraryWithFlights.error) {
      return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, itineraryWithFlights.error, false));
    }

    // Further processing for activities and other details
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
    const enrichedItinerary = await addHotelDetailsToItinerary(itineraryWithTaxi);

    return res.status(StatusCodes.OK).json(httpFormatter({ enrichedItinerary }, 'Create Itinerary Successful'));

  } catch (error) {
    logger.error('Error creating itinerary:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal Server Error', false));
  }
};
