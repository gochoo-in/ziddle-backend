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
import { addHotelDetailsToItinerary } from '../../services/hotelDetails.js'; // Import hotel details service

export const createItinerary = async (req, res) => {
  try {
    const { startDate, adults, children, countryId, cities, activities } = req.body;

    if (!startDate || !countryId) {
      return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Missing required fields in request body.', false));
    }

    // Fetch country details
    const country = await Destination.findById(countryId);
    if (!country) {
      return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Invalid country ID.', false));
    }

    // Fetch city and activity details
    const cityDetails = await City.find({ '_id': { $in: cities } });
    const activityDetails = await Activity.find({ '_id': { $in: activities } });

    if (!cityDetails.length || !activityDetails.length) {
      return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'One or more city or activity IDs are invalid.', false));
    }

    const result = await generateItinerary({
      ...req.body,
      country: country.name,
      // Map over city details and link the corresponding activities for each city
      cities: cityDetails.map(city => ({
        name: city.name,
        iataCode: city.iataCode,
        activities: activityDetails
          .filter(activity => activity.city.toString() === city._id.toString()) // Convert ObjectId to string for comparison
          .map(activity => ({
            name: activity.name,
            duration: activity.duration,
            category: activity.category,  // Added category field
            opensAt: activity.opensAt,
            closesAt: activity.closesAt
          }))
      }))
    });
    
    

    console.log("result", result);
    console.log("itinerary", result.itinerary);

    // Extract title, subtitle, and itinerary from result
    const title = result.title;
    const subtitle = result.subtitle;
    const itinerary = result.itinerary;

    // Include title and subtitle in the itinerary
    const itineraryWithTitles = {
      title,
      subtitle,
      itinerary
    };

    // Add transfer activities and dates to the generated itinerary
    const itineraryWithTravel = addTransferActivity(itineraryWithTitles);
    const itineraryWithDates = addDatesToItinerary(itineraryWithTravel, startDate);
    const transformItinerary = settransformItinerary(itineraryWithDates);

    // Add flight details to the itinerary with dates
    const itineraryWithFlights = await addFlightDetailsToItinerary(transformItinerary, adults, children, cityDetails);

    if (itineraryWithFlights.error) {
      return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, itineraryWithFlights.error, false));
    }

    // Fetch hotel details and add to the itinerary
    const enrichedItinerary = await addHotelDetailsToItinerary(itineraryWithFlights);
    
    return res.status(StatusCodes.OK).json(httpFormatter(enrichedItinerary, 'Create Itinerary Successful'));

  } catch (error) {
    console.error('Error creating itinerary:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal Server Error', false));
  }
};
