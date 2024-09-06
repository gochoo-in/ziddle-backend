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

export const getActivity = async (req, res) => {
    try {
        const { activityId } = req.params;

        if (!activityId) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Activity ID is required', false));
        }

        const activity = await Activity.findById(activityId).populate('city');

        if (!activity) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Activity not found', false));
        }

        return res.status(StatusCodes.OK).json(httpFormatter({ activity }, 'Activity retrieved successfully', true));
    } catch (error) {
        console.error('Error retrieving activity:', error);

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

// Update an existing activity by ID 
export const updateActivity = async (req, res) => {
    try {
        const { activityId } = req.params;
        const { name, duration, category, opensAt, closesAt, cityName } = req.body;

        const activity = await Activity.findById(activityId);
        if (!activity) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Activity not found', false));
        }

        if (name) activity.name = name;
        if (duration) activity.duration = duration;
        if (category) activity.category = category;
        if (opensAt) activity.opensAt = opensAt;
        if (closesAt) activity.closesAt = closesAt;

        if (cityName) {
            const city = await City.findOne({ name: cityName });
            if (!city) {
                return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Referenced city not found', false));
            }
            activity.city = city._id;
        }

        await activity.save();

        return res.status(StatusCodes.OK).json(httpFormatter({ activity }, 'Activity updated successfully', true));
    } catch (error) {
        console.error('Error updating activity:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};
// Delete an existing activity by ID
export const deleteActivity = async (req, res) => {
    try {
        const { activityId } = req.params;

        if (!activityId) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Activity ID is required', false));
        }

        const activity = await Activity.findByIdAndDelete(activityId);

        if (!activity) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Activity not found', false));
        }

        return res.status(StatusCodes.OK).json(httpFormatter({}, 'Activity deleted successfully', true));
    } catch (error) {
        console.error('Error deleting activity:', error);

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};
