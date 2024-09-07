import httpFormatter from '../../../utils/formatter.js';
import Destination from '../../models/destination.js';
import City from '../../models/city.js';
import Activity from '../../models/activity.js';
import StatusCodes from 'http-status-codes';

export const addDestination = async (req, res) => {
    try {
        const {
            name, currency, timezone, tripDuration, description, category, visa_type,
            country, continent, languages_spoken, best_time_to_visit, image_urls,
            latitude, longitude
        } = req.body;

        if (!name) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Destination name is required', false));
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
        if (!latitude || !longitude) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Latitude and longitude are required', false));
        }
        if (!visa_type) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Visa type is required', false));
        }

        const existingDestination = await Destination.findOne({ name });
        if (existingDestination) {
            return res.status(StatusCodes.CONFLICT).json(httpFormatter({}, 'Destination with this name already exists', false));
        }

        const data = await Destination.create({
            name, currency, timezone, tripDuration, description, category, visa_type,
            country, continent, languages_spoken, best_time_to_visit, image_urls,
            latitude, longitude
        });
        return res.status(StatusCodes.CREATED).json(httpFormatter({ data }, 'Destination added successfully', true));

    } catch (error) {
        console.error('Error adding destination:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

// Get all destinations (countries)
export const getAllDestinations = async (req, res) => {
    try {
        const data = await Destination.find();
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

        const destination = await Destination.findById(destinationId);
        if (!destination) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Destination not found', false));
        }

        const cities = await City.find({ destination: destination._id });

        const cityIds = cities.map(city => city._id);

        const activities = await Activity.find({ city: { $in: cityIds } });

        if (activities.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, `No activities found for ${destination.name}`, false));
        }

        return res.status(StatusCodes.OK).json(httpFormatter({ activities }, `Activities retrieved for ${destination.name}`, true));
    } catch (error) {
        console.error('Error retrieving activities by destination:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

// Get all cities for a specific destination
export const getCitiesByDestination = async (req, res) => {
    try {
        const { destinationId } = req.params;

        const destination = await Destination.findById(destinationId);
        if (!destination) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Destination not found', false));
        }

        const cities = await City.find({ destination: destination._id });

        if (cities.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, `No cities found for ${destination.name}`, false));
        }

        return res.status(StatusCodes.OK).json(httpFormatter({ cities }, `Cities for ${destination.name} retrieved successfully`, true));
    } catch (error) {
        console.error('Error retrieving cities by destination:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

export const updateDestination = async (req, res) => {
    try {
        const { destinationId } = req.params;
        const {
            name, currency, timezone, tripDuration, description, category, visa_type,
            country, continent, languages_spoken, best_time_to_visit, image_urls,
            latitude, longitude
        } = req.body;

        const destination = await Destination.findById(destinationId);
        if (!destination) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Destination not found', false));
        }

        if (name) {
            const existingDestination = await Destination.findOne({ name });
            if (existingDestination && existingDestination._id.toString() !== destinationId) {
                return res.status(StatusCodes.CONFLICT).json(httpFormatter({}, 'Destination with this name already exists', false));
            }
            destination.name = name;
        }
        if (currency) {
            destination.currency = currency;
        }
        if (timezone) {
            destination.timezone = timezone;
        }
        if (tripDuration) {
            destination.tripDuration = tripDuration;
        }
        if (description) {
            destination.description = description;
        }
        if (category) {
            destination.category = category;
        }
        if (visa_type) {
            destination.visa_type = visa_type;
        }
        if (country) {
            destination.country = country;
        }
        if (continent) {
            destination.continent = continent;
        }
        if (languages_spoken) {
            destination.languages_spoken = languages_spoken;
        }
        if (best_time_to_visit) {
            destination.best_time_to_visit = best_time_to_visit;
        }
        if (image_urls) {
            destination.image_urls = image_urls;
        }
        if (latitude) {
            destination.latitude = latitude;
        }
        if (longitude) {
            destination.longitude = longitude;
        }

        await destination.save();

        return res.status(StatusCodes.OK).json(httpFormatter({ destination }, 'Destination updated successfully', true));
    } catch (error) {
        console.error('Error updating destination:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

export const deleteDestination = async (req, res) => {
    try {
        const { destinationId } = req.params;

        const destination = await Destination.findById(destinationId);
        if (!destination) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Destination not found', false));
        }

        const cities = await City.find({ Destination: destination._id });

        const cityIds = cities.map(city => city._id);

        await Activity.deleteMany({ city: { $in: cityIds } });

        await City.deleteMany({ destination: destination._id });

        await Destination.deleteOne({ _id: destinationId });

        return res.status(StatusCodes.OK).json(httpFormatter({}, 'Destination and associated cities and activities deleted successfully', true));
    } catch (error) {
        console.error('Error deleting destination:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

export const getDestinationById = async (req, res) => {
    try {
        const { destinationId } = req.params;

        const destination = await Destination.findById(destinationId);
        if (!destination) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Destination not found', false));
        }

        return res.status(StatusCodes.OK).json(httpFormatter({ destination }, 'Destination retrieved successfully', true));
    } catch (error) {
        console.error('Error retrieving destination:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};
