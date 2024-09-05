import httpFormatter from '../../../utils/formatter.js';
import Activity from '../../models/activity.js';
import City from '../../models/city.js';
import StatusCodes from 'http-status-codes';

// Create a new activity and associate it with a city based on the city name
export const addActivity = async (req, res) => {
    try {
        const { name, duration, category, opensAt, closesAt, cityName } = req.body;

        if (!name || !duration || !category || !opensAt || !closesAt || !cityName) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'All fields are required', false));
        }

        const city = await City.findOne({ name: cityName });
        if (!city) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Referenced city not found', false));
        }

        const activity = await Activity.create({ name, duration, category, opensAt, closesAt, city: city._id });

        return res.status(StatusCodes.CREATED).json(httpFormatter({ activity }, 'Activity added and associated with city successfully', true));
    } catch (error) {
        console.error('Error adding activity:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

// Get all activities for a specific city
export const getActivitiesByCity = async (req, res) => {
    try {
        const { cityName } = req.params;

        const city = await City.findOne({ name: cityName }).populate('activities');
        if (!city) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'City not found', false));
        }

        const activities = city.activities; 
        return res.status(StatusCodes.OK).json(httpFormatter({ activities }, 'Activities retrieved successfully', true));
    } catch (error) {
        console.error('Error retrieving activities:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};
