import InternationalAirportCity from '../../models/internationalAirportCity.js';
import httpFormatter from '../../../utils/formatter.js';

// Get all Indian Cities
export const getAllInternationalAirportCities = async (req, res) => {
  try {
    const cities = await InternationalAirportCity.find();
    res.status(200).json(cities);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch cities', error });
  }
};

// Add a new Indian City
export const addInternationalAirportCity = async (req, res) => {
  const { name, imageUrl, country, iataCode, countryCode, mobileCode, currency } = req.body;
  if (!name || !country || !iataCode || !countryCode || !mobileCode || !currency) {
    return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Name, iata code and country are required', false));
  }

  try {
    const newCity = new InternationalAirportCity({ name, imageUrl, country, iataCode, countryCode, mobileCode, currency });
    await newCity.save();
    res.status(201).json(newCity);
  } catch (error) {
    res.status(500).json({ message: 'Failed to add city', error });
  }
};

// Update an Indian City
export const updateInternationalAirportCity = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    const updatedCity = await InternationalAirportCity.findByIdAndUpdate(id, updates, { new: true });
    res.status(200).json(updatedCity);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update city', error });
  }
};

// Delete an Indian City
export const deleteInternationalAirportCity = async (req, res) => {
  const { id } = req.params;
  try {
    await InternationalAirportCity.findByIdAndDelete(id);
    res.status(200).json({ message: 'City deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete city', error });
  }
};
