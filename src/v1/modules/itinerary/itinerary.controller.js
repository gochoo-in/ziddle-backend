import StatusCodes from 'http-status-codes';
import { generateItinerary } from '../../services/gpt.js';
import { addDatesToItinerary } from '../../../utils/dateUtils.js';
import { settransformItinerary } from '../../../utils/transformItinerary.js';
import { addFlightDetailsToItinerary } from '../../services/flightdetails.js';
import { addTransferActivity } from '../../../utils/travelItinerary.js';
import { addGeneralDummyData } from '../../../utils/dummydata.js';
import httpFormatter from '../../../utils/formatter.js';

export const createItinerary = async (req, res) => {
  try {
    const itineraryData = req.body;
    const { startDate, adults, children } = req.body;
    const cityIATACodes = itineraryData.cities.map(city => ({
      name: city.name,
      iataCode: city.iataCode
    }));

    if (!startDate) {
      return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Missing required startDate in request body.', false));
    }

    // Generate the initial itinerary
    const result = await generateItinerary(itineraryData);

    if (result.error) {
      return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, result.error, false));
    }

    // Add title and subtitle to the itinerary
    const { title, subtitle, itinerary } = result;

    // Include title and subtitle in the itinerary
    const itineraryWithTitles = {
      title,
      subtitle,
      itinerary
    };
    
    // Add dates to the generated itinerary
    const itineraryWithTravel=addTransferActivity(itineraryWithTitles);
    const itineraryWithDates = addDatesToItinerary(itineraryWithTravel, startDate);
    const transformItinerary = settransformItinerary(itineraryWithDates);

    // // Add flight details to the itinerary with dates
    const itineraryWithFlights = await addFlightDetailsToItinerary(transformItinerary, adults, children, cityIATACodes);

    if (itineraryWithFlights.error) {
      return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, itineraryWithFlights.error, false));
    }
    const enreachItinerary=addGeneralDummyData(itineraryWithFlights);
    // res.json(enreachItinerary);
    return res.status(StatusCodes.OK).json(httpFormatter(enreachItinerary, 'Crate Iternary Successfull'));
    
  } catch (error) {
    console.error('Error creating itinerary:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal Server Error', false));
  }
};
