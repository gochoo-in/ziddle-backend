import Country from '../../models/country.js';
import httpFormatter from '../../../utils/formatter.js';
import { StatusCodes } from 'http-status-codes'; 

export const getAllCountries = async (req, res) => {
  try {
    const countries = await Country.find();
    res.status(StatusCodes.OK).json(httpFormatter(countries, 'Fetched all countries successfully', true));
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Failed to fetch countries', false, error));
  }
};

export const addCountry = async (req, res) => {
  const { name, isoCode, currency, mobileCode } = req.body;

  if (!name || !isoCode || !currency || !mobileCode) {
    return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Name, ISO code, currency, and mobile code are required', false));
  }

  try {
    const newCountry = new Country({ name, isoCode, currency, mobileCode });
    await newCountry.save();
    res.status(StatusCodes.CREATED).json(httpFormatter(newCountry, 'Country added successfully', true));
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Failed to add country', false, error));
  }
};

export const updateCountry = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const updatedCountry = await Country.findByIdAndUpdate(id, updates, { new: true });
    if (!updatedCountry) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Country not found', false));
    }
    res.status(StatusCodes.OK).json(httpFormatter(updatedCountry, 'Country updated successfully', true));
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Failed to update country', false, error));
  }
};

export const deleteCountry = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedCountry = await Country.findByIdAndDelete(id);
    if (!deletedCountry) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Country not found', false));
    }
    res.status(StatusCodes.OK).json(httpFormatter({}, 'Country deleted successfully', true));
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Failed to delete country', false, error));
  }
};
