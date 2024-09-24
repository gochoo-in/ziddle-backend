import httpFormatter from '../../../utils/formatter.js';
import Activity from '../../models/activity.js';
import City from '../../models/city.js';
import StatusCodes from 'http-status-codes';
import logger from '../../../config/logger.js'

// Create a new activity and associate it with a city based on the city name
export const addActivity = async (req, res) => {
    try {
        const {
            name,
            duration,
            description,
            opensAt,
            closesAt,
            cityName,
            bestTimeToParticipate,
            physicalDifficulty,
            requiredEquipment,
            ageRestriction,
            localGuidesAvailable,
            groupSize,
            culturalSignificance,
            idealCompanionType,
            isFamilyFriendly,
            inclusions,
            exclusions,
            sharedActivity,
            refundable,
            price
        } = req.body;

        // Validate required fields
        if (!name || !duration || !opensAt || !closesAt || !cityName || !physicalDifficulty || localGuidesAvailable === undefined || isFamilyFriendly === undefined || refundable === undefined || price === undefined) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Required fields are missing', false));
        }

        const city = await City.findOne({ name: cityName });
        if (!city) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Referenced city not found', false));
        }

        const activity = await Activity.create({
            name,
            duration,
            description,
            opensAt,
            closesAt,
            city: city._id,
            bestTimeToParticipate,
            physicalDifficulty,
            requiredEquipment,
            ageRestriction,
            localGuidesAvailable,
            groupSize,
            culturalSignificance,
            idealCompanionType,
            isFamilyFriendly,
            inclusions,
            exclusions,
            sharedActivity,
            refundable,
            price
        });

        return res.status(StatusCodes.CREATED).json(httpFormatter({ activity }, 'Activity added and associated with city successfully', true));
    } catch (error) {
        logger.error('Error adding activity:', { message: error.message });
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};


export const toggleActivityActiveStatus = async (req, res) => {
    const { id } = req.params;

    try {
      // Find the city by ID
      const activity = await Activity.findById(id);
  
      if (!activity) {
        return res.status(404).json({ message: 'Activity not found' });
      }
  
      // Toggle the isActive status
      activity.isActive = !activity.isActive;
      await activity.save();
  
      return res.status(200).json({
        success: true,
        message: `Activity ${activity.isActive ? 'activated' : 'deactivated'} successfully`,
        isActive: activity.isActive,
      });
    } catch (error) {
      console.error('Error updating activity status:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  };


// Get an activity by ID
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
        logger.error('Error retrieving activity:', { message: error.message });
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

// Update an existing activity by ID
export const updateActivity = async (req, res) => {
    try {
        const { activityId } = req.params;
        const {
            name,
            duration,
            description,
            opensAt,
            closesAt,
            cityName,
            bestTimeToParticipate,
            physicalDifficulty,
            requiredEquipment,
            ageRestriction,
            localGuidesAvailable,
            groupSize,
            culturalSignificance,
            idealCompanionType,
            isFamilyFriendly,
            inclusions,
            exclusions,
            sharedActivity,
            refundable,
            price
        } = req.body;

        if (!activityId) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Activity ID is required', false));
        }

        const activity = await Activity.findById(activityId);
        if (!activity) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Activity not found', false));
        }

        // Update fields if they are provided
        if (name) activity.name = name;
        if (duration) activity.duration = duration;
        if (description) activity.description = description;
        if (opensAt) activity.opensAt = opensAt;
        if (closesAt) activity.closesAt = closesAt;

        // Update city reference
        if (cityName) {
            const city = await City.findOne({ name: cityName });
            if (!city) {
                return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Referenced city not found', false));
            }
            activity.city = city._id;
        }

        // Update remaining fields
        if (bestTimeToParticipate) activity.bestTimeToParticipate = bestTimeToParticipate;
        if (physicalDifficulty) activity.physicalDifficulty = physicalDifficulty;
        if (requiredEquipment) activity.requiredEquipment = requiredEquipment;
        if (ageRestriction) activity.ageRestriction = ageRestriction;
        if (localGuidesAvailable !== undefined) activity.localGuidesAvailable = localGuidesAvailable;
        if (groupSize) activity.groupSize = groupSize;
        if (culturalSignificance) activity.culturalSignificance = culturalSignificance;
        if (idealCompanionType) activity.idealCompanionType = idealCompanionType;
        if (isFamilyFriendly !== undefined) activity.isFamilyFriendly = isFamilyFriendly;
        if (inclusions) activity.inclusions = inclusions;
        if (exclusions) activity.exclusions = exclusions;
        if (sharedActivity !== undefined) activity.sharedActivity = sharedActivity;
        if (refundable !== undefined) activity.refundable = refundable;
        if (price !== undefined) activity.price = price;

        await activity.save();

        return res.status(StatusCodes.OK).json(httpFormatter({ activity }, 'Activity updated successfully', true));
    } catch (error) {
        logger.error('Error updating activity:', { message: error.message });
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
        logger.error('Error deleting activity:', { message: error.message });
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};
