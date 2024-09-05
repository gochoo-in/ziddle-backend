import httpFormatter from '../../../utils/formatter.js';
import Country from '../../models/country.js';
import City from '../../models/city.js';
import Activity from '../../models/activity.js';
import StatusCodes from 'http-status-codes';

export const addDestination = async (req, res) => {
    try {
        const { name, currency, timezone } = req.body;

        // Validate required fields
        if (!name) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Country name is required', false));
        }
        if (!currency) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Currency is required', false));
        }
        if (!timezone) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Timezone is required', false));
        }

        // Check if country already exists
        const existingCountry = await Country.findOne({ name });
        if (existingCountry) {
            return res.status(StatusCodes.CONFLICT).json(httpFormatter({}, 'Country with this name already exists', false));
        }

        // Create and save new country with name, currency, and timezone
        const data = await Country.create({ name, currency, timezone });
        return res.status(StatusCodes.CREATED).json(httpFormatter({ data }, 'Destination added successfully', true));

    } catch (error) {
        console.error('Error adding destination:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};


// Get all destinations (countries)
export const getAllDestinations = async (req, res) => {
    try {
        const data = await Country.find();
        return res.status(StatusCodes.OK).json(httpFormatter({ data }, 'Destinations retrieved successfully', true));
    } catch (error) {
        console.error('Error retrieving destinations:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

// Get all activities for a specific destination
export const getActivitiesByDestination = async (req, res) => {
    try {
        const { destinationId } = req.params;

        const country = await Country.findById(destinationId);
        if (!country) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Destination not found', false));
        }

        const cities = await City.find({ country: country._id });

        const cityIds = cities.map(city => city._id);

        const activities = await Activity.find({ city: { $in: cityIds } });

        return res.status(StatusCodes.OK).json(httpFormatter({ activities }, `Activities retrieved for ${country.name} `, true));
    } catch (error) {
        console.error('Error retrieving activities by destination:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};


export const getCitiesByDestination = async (req, res) => {
    try {
        const { destinationId } = req.params;

        const country = await Country.findById(destinationId);
        if (!country) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Destination not found', false));
        }

        const cities = await City.find({ country: country._id });
        return res.status(StatusCodes.OK).json(httpFormatter({ cities }, `Cities for ${country.name} retrieved successfully`, true));
    } catch (error) {
        console.error('Error retrieving cities by destination:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};