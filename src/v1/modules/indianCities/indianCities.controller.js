import IndianCity from '../../models/indianCity.js';
import httpFormatter from '../../../utils/formatter.js';

// Get all Indian Cities
export const getAllIndianCities = async (req, res) => {
  try {
    const cities = await IndianCity.find();
    res.status(200).json(cities);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch cities', error });
  }
};

// Add a new Indian City
export const addIndianCity = async (req, res) => {
  const { name, imageUrl } = req.body;
  if(!name){
    return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Indian city name is required', false));
  }

  try {
    const newCity = new IndianCity({ name, imageUrl });
    await newCity.save();
    res.status(201).json(newCity);
  } catch (error) {
    res.status(500).json({ message: 'Failed to add city', error });
  }
};

// Update an Indian City
export const updateIndianCity = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    const updatedCity = await IndianCity.findByIdAndUpdate(id, updates, { new: true });
    res.status(200).json(updatedCity);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update city', error });
  }
};

// Delete an Indian City
export const deleteIndianCity = async (req, res) => {
  const { id } = req.params;
  try {
    await IndianCity.findByIdAndDelete(id);
    res.status(200).json({ message: 'City deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete city', error });
  }
};
