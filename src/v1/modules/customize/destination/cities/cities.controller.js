import httpFormatter from '../../../../../utils/formatter.js';
import City from '../../../../models/city.js';
import Country from '../../../../models/country.js';
import Activity from '../../../../models/activity.js'
import StatusCodes from 'http-status-codes';
import mongoose from 'mongoose';
// Create a new city
export const addCity = async (req, res) => {
    try {
        const { name, iataCode, countryName } = req.body;

        if (!name || !iataCode || !countryName) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Name, IATA code, and country name are required', false));
        }

        const country = await Country.findOne({ name: countryName });
        if (!country) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Referenced country not found', false));
        }

        const city = await City.create({ name, iataCode, country: country._id });
        return res.status(StatusCodes.CREATED).json(httpFormatter({ city }, 'City added successfully', true));
    } catch (error) {
        console.error('Error adding city:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

// Get all cities
export const getAllCities = async (req, res) => {
    try {
        const cities = await City.find()
        return res.status(StatusCodes.OK).json(httpFormatter({ cities }, 'Cities retrieved successfully', true));
    } catch (error) {
        console.error('Error retrieving cities:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

// Add activity to a city
export const addActivityToCity = async (req, res) => {
    try {
        const { cityName, activityId } = req.body;

        if (!cityName || !activityId) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'City name and activity ID are required', false));
        }

        if (!mongoose.Types.ObjectId.isValid(activityId)) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Invalid activity ID format', false));
        }

        const city = await City.findOne({ name: cityName });
        if (!city) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'City not found', false));
        }

        const activity = await Activity.findById(activityId);
        if (!activity) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Activity not found', false));
        }

        if (!city.activities.includes(activityId)) {
            city.activities.push(activityId);
            await city.save();
        }

        return res.status(StatusCodes.OK).json(httpFormatter({ city }, 'Activity added to city successfully', true));
    } catch (error) {
        console.error('Error adding activity to city:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};


// Remove activity from a city
export const removeActivityFromCity = async (req, res) => {
    try {
        const { cityName, activityId } = req.body;

        if (!cityName || !activityId) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'City name and activity ID are required', false));
        }

        const city = await City.findOne({ name: cityName });
        if (!city) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'City not found', false));
        }

        city.activities = city.activities.filter(activity => activity.toString() !== activityId);
        await city.save();

        return res.status(StatusCodes.OK).json(httpFormatter({ city }, 'Activity removed from city successfully', true));
    } catch (error) {
        console.error('Error removing activity from city:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};
