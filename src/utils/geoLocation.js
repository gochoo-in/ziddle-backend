
import axios from 'axios';
import logger from '../config/logger.js';
export const getLocationFromIp = async (ip_address) => {
  try {
    const response = await axios.get(`https://api.iplocation.net/?ip=${ip_address}`);
    const data = response.data;
      return `${data.country_name}`;
  } catch (error) {
    logger.error('Error fetching location from iplocation.net:', error);
    return 'Unknown location'; 
  }
};
  