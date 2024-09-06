import httpFormatter from '../../../utils/formatter.js';
import Country from '../../models/country.js';
import City from '../../models/city.js';
import Activity from '../../models/activity.js';
import StatusCodes from 'http-status-codes';

export const addDestination = async (req, res) => {
    try {
        const { name, currency, timezone, tripDuration } = req.body;

        if (!name) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Country name is required', false));
        }
        if (!currency) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Currency is required', false));
        }
        if (!timezone) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Timezone is required', false));
        }
        if (!tripDuration || !Array.isArray(tripDuration) || tripDuration.length === 0) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Trip duration is required and should be a non-empty array', false));
        }

        const existingCountry = await Country.findOne({ name });
        if (existingCountry) {
            return res.status(StatusCodes.CONFLICT).json(httpFormatter({}, 'Country with this name already exists', false));
        }

        const data = await Country.create({ name, currency, timezone, tripDuration });
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

        if(activities.length === 0){
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, `No activities found for ${country.name}`, false));
        }

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

        if (cities.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, `No cities found for ${country.name}`, false));
        }

        return res.status(StatusCodes.OK).json(httpFormatter({ cities }, `Cities for ${country.name} retrieved successfully`, true));
    } catch (error) {
        console.error('Error retrieving cities by destination:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

export const updateDestination = async (req, res) => {
    try {
        const { destinationId } = req.params;
        const { name, currency, timezone,tripDuration } = req.body;

        // Check if the destination (country) exists
        const country = await Country.findById(destinationId);
        if (!country) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Destination not found', false));
        }

        // Update fields only if they are provided in the request body
        if (name) {
            const existingCountry = await Country.findOne({ name });
            if (existingCountry && existingCountry._id.toString() !== destinationId) {
                return res.status(StatusCodes.CONFLICT).json(httpFormatter({}, 'Country with this name already exists', false));
            }
            country.name = name;
        }
        if (currency) {
            country.currency = currency;
        }
        if (timezone) {
            country.timezone = timezone;
        }
        if(tripDuration){
            country.tripDuration=tripDuration;
        }

        // Save the updated country document
        await country.save();

        return res.status(StatusCodes.OK).json(httpFormatter({ country }, 'Destination updated successfully', true));
    } catch (error) {
        console.error('Error updating destination:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

export const deleteDestination = async (req, res) => {
    try {
        const { destinationId } = req.params;

        const country = await Country.findById(destinationId);
        if (!country) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Destination not found', false));
        }

        const cities = await City.find({ country: country._id });

        const cityIds = cities.map(city => city._id);

        await Activity.deleteMany({ city: { $in: cityIds } });

        await City.deleteMany({ country: country._id });

        await country.deleteOne();

        return res.status(StatusCodes.OK).json(httpFormatter({}, 'Destination and associated cities and activities deleted successfully', true));
    } catch (error) {
        console.error('Error deleting destination:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

export const getDestinationById = async (req, res) => {
    try {
        const { destinationId } = req.params;

        const country = await Country.findById(destinationId);
        if (!country) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Destination not found', false));
        }

        return res.status(StatusCodes.OK).json(httpFormatter({ country }, 'Destination retrieved successfully', true));
    } catch (error) {
        console.error('Error retrieving destination:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};
