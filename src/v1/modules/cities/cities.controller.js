import httpFormatter from '../../../utils/formatter.js';
import City from '../../models/city.js';
import Destination from '../../models/destination.js';
import Activity from '../../models/activity.js';
import StatusCodes from 'http-status-codes';

// Create a new city
export const addCity = async (req, res) => {
    try {
        const {
            name,
            iataCode,
            destinationName,
            country,
            latitude,
            longitude,
            bestTimeToVisit,
            isMajorHub,
            pointsOfInterest,
            climate,
            languageSpoken,
            travelTimeFromHub
        } = req.body;

        if (!name || !iataCode || !destinationName || !country || latitude === undefined || longitude === undefined || !languageSpoken) {
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
            bestTimeToVisit,
            isMajorHub,
            pointsOfInterest,
            climate,
            languageSpoken,
            travelTimeFromHub
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
        const {
            name,
            iataCode,
            destinationName,
            country,
            latitude,
            longitude,
            bestTimeToVisit,
            isMajorHub,
            pointsOfInterest,
            climate,
            languageSpoken,
            travelTimeFromHub
        } = req.body;

        if (!name && !iataCode && !destinationName && !country && latitude === undefined && longitude === undefined && !languageSpoken) {
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
        if (bestTimeToVisit) city.bestTimeToVisit = bestTimeToVisit;
        if (isMajorHub !== undefined) city.isMajorHub = isMajorHub;
        if (pointsOfInterest) city.pointsOfInterest = pointsOfInterest;
        if (climate) city.climate = climate;
        if (languageSpoken) city.languageSpoken = languageSpoken;
        if (travelTimeFromHub !== undefined) city.travelTimeFromHub = travelTimeFromHub;

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
