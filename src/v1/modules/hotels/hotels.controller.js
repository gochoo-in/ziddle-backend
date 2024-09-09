import { fetchHotels } from '../../services/hotelService.js';
import { StatusCodes } from 'http-status-codes';
import httpFormatter from '../../../utils/formatter.js';

// Controller to get hotel data by cityId, startDate, endDate, adults, and rooms
export const getHotels = async (req, res) => {
    try {
        const { cityId } = req.params;
        const { startDate, endDate, adults, rooms } = req.query;

        // Validate that required query params are provided
        if (!startDate || !endDate || !adults || !rooms) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Missing required query parameters: startDate, endDate, adults, or rooms', false));
        }

        // Fetch hotels using the service
        const hotels = await fetchHotels(cityId, startDate, endDate, adults, rooms);

        if (!hotels || hotels.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'No hotels found for the given criteria', false));
        }

        // If successful, return the hotel data
        return res.status(StatusCodes.OK).json(httpFormatter({ hotels }, 'Hotels retrieved successfully', true));
    } catch (error) {
        console.error('Error retrieving hotels:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};
