import httpFormatter from '../../../utils/formatter.js';
import City from '../../models/city.js';
import Destination from '../../models/destination.js';
import Activity from '../../models/activity.js';
import StatusCodes from 'http-status-codes';

// Create a new city
export const addCity = async (req, res) => {
    try {
        const { name, iataCode, destinationName, country, latitude, longitude, best_time_to_visit, is_major_hub, points_of_interest, climate, language_spoken, travel_time_from_hub } = req.body;

        if (!name || !iataCode || !destinationName || !country || latitude === undefined || longitude === undefined || !language_spoken) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'All required fields must be provided', false));
        }

        const destination = await Destination.findOne({ name: destinationName });
        if (!destination) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, `${destinationName} not found`, false));
        }

        const city = await City.create({
            name,
            iataCode,
            destination: destination._id,
            country,
            latitude,
            longitude,
            best_time_to_visit,
            is_major_hub,
            points_of_interest,
            climate,
            language_spoken,
            travel_time_from_hub
        });

        return res.status(StatusCodes.CREATED).json(httpFormatter({ city }, 'City added successfully', true));
    } catch (error) {
        console.error('Error adding city:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

// Get all cities
export const getAllCities = async (req, res) => {
    try {
        const cities = await City.find();
        return res.status(StatusCodes.OK).json(httpFormatter({ cities }, 'Cities retrieved successfully', true));
    } catch (error) {
        console.error('Error retrieving cities:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

// Get a city with its activities using aggregation
export const getCityWithActivities = async (req, res) => {
    try {
        const { cityName } = req.params;

        const city = await City.aggregate([
            { $match: { name: cityName } },
            {
                $lookup: {
                    from: 'activities',
                    localField: '_id',
                    foreignField: 'city',
                    as: 'activities'
                }
            }
        ]);

        if (city.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'City not found', false));
        }

        return res.status(StatusCodes.OK).json(httpFormatter({ city: city[0] }, 'City with activities retrieved successfully', true));
    } catch (error) {
        console.error('Error retrieving city with activities:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

// Get a city by ID
export const getCityById = async (req, res) => {
    try {
        const { cityId } = req.params;

        const city = await City.findById(cityId);
        if (!city) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'City not found', false));
        }

        return res.status(StatusCodes.OK).json(httpFormatter({ city }, 'City retrieved successfully', true));
    } catch (error) {
        console.error('Error retrieving city by ID:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

// Update a city by ID
export const updateCityById = async (req, res) => {
    try {
        const { cityId } = req.params;
        const { name, iataCode, destinationName, country, latitude, longitude, best_time_to_visit, is_major_hub, points_of_interest, climate, language_spoken, travel_time_from_hub } = req.body;

        if (!name && !iataCode && !destinationName && !country && latitude === undefined && longitude === undefined && !language_spoken) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'At least one field is required to update', false));
        }

        const city = await City.findById(cityId);
        if (!city) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'City not found', false));
        }

        if (name) city.name = name;
        if (iataCode) city.iataCode = iataCode;
        if (destinationName) {
            const destination = await Destination.findOne({ name: destinationName });
            if (!destination) {
                return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, `${destinationName} not found`, false));
            }
            city.destination = destination._id;
        }
        if (country) city.country = country;
        if (latitude !== undefined) city.latitude = latitude;
        if (longitude !== undefined) city.longitude = longitude;
        if (best_time_to_visit) city.best_time_to_visit = best_time_to_visit;
        if (is_major_hub !== undefined) city.is_major_hub = is_major_hub;
        if (points_of_interest) city.points_of_interest = points_of_interest;
        if (climate) city.climate = climate;
        if (language_spoken) city.language_spoken = language_spoken;
        if (travel_time_from_hub !== undefined) city.travel_time_from_hub = travel_time_from_hub;

        await city.save();
        return res.status(StatusCodes.OK).json(httpFormatter({ city }, 'City updated successfully', true));
    } catch (error) {
        console.error('Error updating city by ID:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

// Delete a city by ID
export const deleteCityById = async (req, res) => {
    try {
        const { cityId } = req.params;

        const city = await City.findById(cityId);
        if (!city) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'City not found', false));
        }

        await Activity.deleteMany({ city: city._id });
        await City.findByIdAndDelete(cityId);

        return res.status(StatusCodes.OK).json(httpFormatter({}, 'City and associated activities deleted successfully', true));
    } catch (error) {
        console.error('Error deleting city and activities:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};
