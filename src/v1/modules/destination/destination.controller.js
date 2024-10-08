import httpFormatter from '../../../utils/formatter.js';
import Destination from '../../models/destination.js';
import City from '../../models/city.js';
import Activity from '../../models/activity.js';
import StatusCodes from 'http-status-codes';
import mongoose from 'mongoose';
import logger from '../../../config/logger.js';

// Create a new destination
export const addDestination = async (req, res) => {
    try {
        const {
            name, currency, timezone, tripDuration, description, category, visaType,
            country, continent, languagesSpoken, bestTimeToVisit, imageUrls,
            latitude, longitude,markupPrice
        } = req.body;

        // Validate required fields
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
        if (!visaType) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Visa type is required', false));
        }
        if (!country) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Country is required', false));
        }
        if (!continent) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Continent is required', false));
        }

        // Validate imageUrls if provided
        if (imageUrls) {
            if (!Array.isArray(imageUrls)) {
                return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Image URLs must be an array of objects', false));
            }
            for (const image of imageUrls) {
                if (typeof image !== 'object' || !image.type || !image.url) {
                    return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Each image URL must be an object with type and URL fields', false));
                }
                // Check URL format
                try {
                    new URL(image.url); // Validate URL
                } catch (e) {
                    return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Each image URL must be a valid URI', false));
                }
            }
        }

        const existingDestination = await Destination.findOne({ name });
        if (existingDestination) {
            return res.status(StatusCodes.CONFLICT).json(httpFormatter({}, 'Destination with this name already exists', false));
        }

        const data = await Destination.create({
            name, currency, timezone, tripDuration, description, category, visaType,
            country, continent, languagesSpoken, bestTimeToVisit, imageUrls,
            latitude, longitude,markupPrice
        });
        return res.status(StatusCodes.CREATED).json(httpFormatter({ data }, 'Destination added successfully', true));

    } catch (error) {
        logger.error('Error adding destination:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};






export const toggleDestinationActiveStatus = async (req, res) => {
  const { id } = req.params;

  try {
    // Find the destination by ID
    const destination = await Destination.findById(id);

    if (!destination) {
      return res.status(404).json({ message: 'Destination not found' });
    }

    // Toggle the active status
    destination.active = !destination.active;
    await destination.save();

    return res.status(200).json({
      success: true,
      message: `Destination ${destination.active ? 'activated' : 'deactivated'} successfully`,
      active: destination.active,
    });
  } catch (error) {
    console.error('Error toggling destination status:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};



// Get all destinations
export const getAllDestinations = async (req, res) => {
  try {
    const isActive = req.query.active === 'true';
    const query = isActive ? { active: true } : {};

    const destinations = await Destination.find(query);

    return res.status(StatusCodes.OK).json({
      data: {
        data: destinations,
      },
      message: 'Destinations retrieved successfully',
    });
  } catch (error) {
    console.error('Error retrieving destinations:', error);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: 'Internal server error' });
  }
};


// Get all activities for a specific destination
export const getActivitiesByDestination = async (req, res) => {
    try {
        const { destinationId } = req.params;

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(destinationId)) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Invalid destination ID', false));
        }

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
        logger.error('Error retrieving activities by destination:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

// Get all cities for a specific destination
export const getCitiesByDestination = async (req, res) => {
    try {
        const { destinationId } = req.params;

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(destinationId)) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Invalid destination ID', false));
        }

        const destination = await Destination.findById(destinationId);
        if (!destination) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Destination not found', false));
        }

        const cities = await City.find({ destination: destination._id });



        return res.status(StatusCodes.OK).json(httpFormatter({ cities }, `Cities for ${destination.name} retrieved successfully`, true));
    } catch (error) {
        logger.error('Error retrieving cities by destination:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

// Update a destination
export const updateDestination = async (req, res) => {
    try {
        const { destinationId } = req.params;

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(destinationId)) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Invalid destination ID', false));
        }

        const {
            name, currency, timezone, tripDuration, description, category, visaType,
            country, continent, languagesSpoken, bestTimeToVisit, imageUrls,
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
        if (visaType) {
            destination.visaType = visaType;
        }
        if (country) {
            destination.country = country;
        }
        if (continent) {
            destination.continent = continent;
        }
        if (languagesSpoken) {
            destination.languagesSpoken = languagesSpoken;
        }
        if (bestTimeToVisit) {
            destination.bestTimeToVisit = bestTimeToVisit;
        }
        if (imageUrls) {
            if (!Array.isArray(imageUrls)) {
                return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Image URLs must be an array of objects', false));
            }
            for (const image of imageUrls) {
                if (typeof image !== 'object' || !image.type || !image.url) {
                    return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Each image URL must be an object with type and URL fields', false));
                }
                try {
                    new URL(image.url); // Validate URL
                } catch (e) {
                    return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Each image URL must be a valid URI', false));
                }
            }
            destination.imageUrls = imageUrls;
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
        logger.error('Error updating destination:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

// Delete a destination
export const deleteDestination = async (req, res) => {
    try {
        const { destinationId } = req.params;

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(destinationId)) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Invalid destination ID', false));
        }

        const destination = await Destination.findById(destinationId);
        if (!destination) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Destination not found', false));
        }

        const cities = await City.find({ destination: destination._id });

        const cityIds = cities.map(city => city._id);

        await Activity.deleteMany({ city: { $in: cityIds } });

        await City.deleteMany({ destination: destination._id });

        await Destination.deleteOne({ _id: destinationId });

        return res.status(StatusCodes.OK).json(httpFormatter({}, 'Destination and associated cities and activities deleted successfully', true));
    } catch (error) {
        logger.error('Error deleting destination:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

// Get a destination by ID
export const getDestinationById = async (req, res) => {
    try {
        const { destinationId } = req.params;

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(destinationId)) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Invalid destination ID', false));
        }

        const destination = await Destination.findById(destinationId);
        if (!destination) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Destination not found', false));
        }

        return res.status(StatusCodes.OK).json(httpFormatter({ destination }, 'Destination retrieved successfully', true));
    } catch (error) {
        logger.error('Error retrieving destination:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};
