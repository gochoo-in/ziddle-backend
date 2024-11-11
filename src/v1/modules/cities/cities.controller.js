import httpFormatter from '../../../utils/formatter.js';
import City from '../../models/city.js';
import Destination from '../../models/destination.js';
import Activity from '../../models/activity.js';
import StatusCodes from 'http-status-codes';
import logger from '../../../config/logger.js';
import mongoose from 'mongoose'
// Create a new city
export const addCity = async (req, res) => {
    try {
        const {
            name,
            iataCode,
            destinationId,
            country,
            imageUrls,
            latitude,
            longitude,
            bestTimeToVisit,
            isMajorHub,
            pointsOfInterest,
            climate,
            languageSpoken,
            travelTimeFromHub
        } = req.body;

        if (!name || !iataCode || !destinationId  || latitude === undefined || longitude === undefined || !languageSpoken) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'All required fields must be provided', false));
        }

        const destination = await Destination.findById(destinationId);
        if (!destination) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, `${destinationId} not found`, false));
        }

        const city = await City.create({
            name,
            iataCode,
            destination: destination._id,
            country:destination.name,
            imageUrls,
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
        logger.error('Error adding city:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

// Get all cities
export const getAllCities = async (req, res) => {
    try {
        const isActive = req.query.active === 'true';
        const query = isActive ? { isActive: true } : {};

        const cities = await City.find(query);

        return res.status(StatusCodes.OK).json(httpFormatter({ cities }, 'Cities retrieved successfully', true));
    } catch (error) {
        logger.error('Error retrieving cities:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};



export const getCityWithActivities = async (req, res) => {
    try {
        const { cityId } = req.params;

        // Ensure cityId is converted to ObjectId
        const objectIdCity = new mongoose.Types.ObjectId(cityId);

        // Adding a log for debugging
        console.log(`Fetching activities for cityId: ${cityId}`);

        const city = await City.aggregate([
            { $match: { _id: objectIdCity } },  // Match by cityId as ObjectId
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
            console.log(`No city found for cityId: ${cityId}`);
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'City not found', false));
        }

        console.log(`Activities found for city: ${city[0].activities}`);
        
        return res.status(StatusCodes.OK).json(httpFormatter({ data: city[0].activities }, 'City with activities retrieved successfully', true));
    } catch (error) {
        logger.error('Error retrieving city with activities:', error);
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
        logger.error('Error retrieving city by ID:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};


export const toggleCityActiveStatus = async (req, res) => {
    const { id } = req.params;

    try {
      // Find the city by ID
      const city = await City.findById(id);
  
      if (!city) {
        return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'City not found', false));
      }
  
      // Toggle the isActive status
      city.isActive = !city.isActive;
      await city.save();
  
      return res.status(200).json({
        success: true,
        message: `City ${city.isActive ? 'activated' : 'deactivated'} successfully`,
        isActive: city.isActive,
      });
    } catch (error) {
      console.error('Error updating city status:', error);
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
        logger.error('Error updating city by ID:', error);
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
        logger.error('Error deleting city and activities:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

// get activities for multiple cities
export const getActivitiesForMultipleCities = async (req, res) => {
    try {
        let { cityIds } = req.query;

        if (!cityIds) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'cityIds query parameter is required', false));
        }
        if (!Array.isArray(cityIds)) {
            cityIds = [cityIds];  
        }

        const activities = await Activity.find({ city: { $in: cityIds } });

        if (activities.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'No activities found for the specified cities', false));
        }

        return res.status(StatusCodes.OK).json(httpFormatter({ activities }, 'Activities retrieved successfully', true));
    } catch (error) {
        logger.error('Error retrieving activities for multiple cities:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

