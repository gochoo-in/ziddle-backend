import City from '../../models/city.js';
import logger from '../../../config/logger.js';
import fetchHotelDetails from '../../services/hotelDetails.js';
import StatusCodes from 'http-status-codes';
import httpFormatter from '../../../utils/formatter.js';

export const getTopHotels = async (req, res) => {
    const { cityId } = req.params;
    const { arrivalDate, departureDate, adults = 1 } = req.query;

    try {
        logger.info(`Fetching hotels for cityId: ${cityId}, arrivalDate: ${arrivalDate}, departureDate: ${departureDate}, adults: ${adults}`);

        if (!arrivalDate || !departureDate) {
            logger.warn('Missing arrival or departure date');
            return res
                .status(StatusCodes.BAD_REQUEST)
                .json(httpFormatter({}, 'Arrival date and departure date are required.', false));
        }

        const city = await City.findById(cityId);
        if (!city) {
            logger.warn(`City with ID ${cityId} not found`);
            return res
                .status(StatusCodes.NOT_FOUND)
                .json(httpFormatter({}, 'City not found.', false));
        }

        const { latitude, longitude } = city;
        logger.info(`Found city: ${city.name}, latitude: ${latitude}, longitude: ${longitude}`);

        const hotels = await fetchHotelDetails(latitude, longitude, arrivalDate, departureDate, adults);

        const hotelsArray = Array.isArray(hotels) ? hotels : [hotels];

        if (!hotelsArray || hotelsArray.length === 0) {
            logger.warn(`No hotels found for cityId: ${cityId} and the specified dates.`);
            return res
                .status(StatusCodes.NOT_FOUND)
                .json(httpFormatter({}, 'No hotels found for the specified city and dates.', false));
        }

        const top5Hotels = hotelsArray.slice(0, 5);

        logger.info(`Successfully fetched 5 hotels for cityId: ${cityId}`);

        return res
            .status(StatusCodes.OK)
            .json(httpFormatter({ top5Hotels }, 'Hotels fetched successfully.'));
    } catch (error) {
        logger.error('Error fetching hotels:', { message: error.message });
        return res
            .status(StatusCodes.INTERNAL_SERVER_ERROR)
            .json(httpFormatter({}, 'Internal server error.', false));
    }
};
 