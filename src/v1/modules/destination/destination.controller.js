import httpFormatter from '../../../utils/formatter.js';
import Country from '../../models/country.js';
import StatusCodes from 'http-status-codes';

export const addDestination = async (req, res) => {
    try {
        if (!req.body.name) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Country name is required', false));
        }

        const existingCountry = await Country.findOne({ name: req.body.name });
        if (existingCountry) {
            return res.status(StatusCodes.CONFLICT).json(httpFormatter({}, 'Country with this name already exists', false));
        }

        const data = await Country.create({ name: req.body.name });
        return res.status(StatusCodes.CREATED).json(httpFormatter({ data }, 'Destination added successfully', true));

    } catch (error) {
        console.error('Error adding destination:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

export const getAllDestinations = async (req, res) => {
    try {
        const data = await Country.find();
        return res.status(StatusCodes.OK).json(httpFormatter({ data }, 'Destinations retrieved successfully', true));
    } catch (error) {
        console.error('Error retrieving destinations:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};
