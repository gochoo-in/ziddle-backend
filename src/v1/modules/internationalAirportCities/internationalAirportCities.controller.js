import InternationalAirportCity from '../../models/internationalAirportCity.js';
import Country from '../../models/country.js';  
import httpFormatter from '../../../utils/formatter.js';
import { StatusCodes } from 'http-status-codes';

export const getAllInternationalAirportCities = async (req, res) => {
  try {
    const cities = await InternationalAirportCity.find();
    res.status(StatusCodes.OK).json(httpFormatter(cities, 'Fetched all cities successfully', true));
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Failed to fetch cities', false, error));
  }
};

export const getInternationalAirportCityById = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'City ID is required', false));
  }

  try {
    const city = await InternationalAirportCity.findById(id);

    if (!city) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'City not found', false));
    }

    res.status(StatusCodes.OK).json(httpFormatter(city, 'Fetched city successfully', true));
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Failed to fetch city', false, error));
  }
};


export const getCitiesByCountry = async (req, res) => {
  const { countryId } = req.params;

  if (!countryId) {
    return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Country ID is required', false));
  }

  try {
    const countryExists = await Country.findById(countryId);
    if (!countryExists) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Country not found', false));
    }

    const cities = await InternationalAirportCity.find({ country: countryId });

    if (cities.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'No cities found for this country', false));
    }

    res.status(StatusCodes.OK).json(httpFormatter(cities, 'Fetched cities for the country', true));
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Failed to fetch cities by country', false, error));
  }
};

export const addInternationalAirportCity = async (req, res) => {
  const { name, imageUrl, country, iataCode } = req.body;

  if (!name || !country || !iataCode) {
    return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Name, IATA code, and country are required', false));
  }

  try {
    const countryExists = await Country.findById(country);
    if (!countryExists) {
      return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Invalid country ID', false));
    }

    const newCity = new InternationalAirportCity({ name, imageUrl, country, iataCode });
    await newCity.save();
    res.status(StatusCodes.CREATED).json(httpFormatter(newCity, 'City added successfully', true));

  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Failed to add city', false, error));
  }
};

// Update an International Airport City
export const updateInternationalAirportCity = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const updatedCity = await InternationalAirportCity.findByIdAndUpdate(id, updates, { new: true });

    if (!updatedCity) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'City not found', false));
    }

    res.status(StatusCodes.OK).json(httpFormatter(updatedCity, 'City updated successfully', true));
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Failed to update city', false, error));
  }
};

// Delete an International Airport City
export const deleteInternationalAirportCity = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedCity = await InternationalAirportCity.findByIdAndDelete(id);

    if (!deletedCity) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'City not found', false));
    }

    res.status(StatusCodes.OK).json(httpFormatter({}, 'City deleted successfully', true));
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Failed to delete city', false, error));
  }
};

// Get all Indian Cities
export const getAllIndianCities = async (req, res) => {
  try {
    const indiaCountry = await Country.findOne({ name: 'India' });

    if (!indiaCountry) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'India not found in countries', false));
    }

    const indianCities = await InternationalAirportCity.find({ country: indiaCountry._id });

    if (indianCities.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'No cities found for India', false));
    }

    res.status(StatusCodes.OK).json(httpFormatter(indianCities, 'Fetched Indian cities successfully', true));
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Failed to fetch Indian cities', false, error));
  }
};
