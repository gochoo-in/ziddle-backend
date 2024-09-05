import { fetchHotels } from '../../services/hotelService.js';

// Controller to get hotel data by cityId, startDate, endDate, adults, and rooms
export const getHotels = async (req, res) => {
  try {
    const { cityId } = req.params;
    const { startDate, endDate, adults, rooms } = req.query;
    
    // Validate that required query params are provided
    if (!startDate || !endDate || !adults || !rooms) {
      return res.status(400).json({ message: 'Missing required query parameters: startDate, endDate, adults, or rooms' });
    }

    // Fetch hotels using the service
    const hotels = await fetchHotels(cityId, startDate, endDate, adults, rooms);

    // If successful, return the hotel data
    res.status(200).json(hotels);

  } catch (error) {
    // If there's an error, send it as a response
    res.status(500).json({ message: error.message });
  }
};
