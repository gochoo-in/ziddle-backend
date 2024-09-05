import httpFormatter from '../../../utils/formatter.js';
import City from '../../models/city.js';
import Country from '../../models/country.js';
import Activity from '../../models/activity.js';
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
