
import axios from 'axios';

export const getLocationFromIp = async (ip_address) => {
  try {
    const response = await axios.get(`https://api.iplocation.net/?ip=${ip_address}`);
    const data = response.data;
      return `${data.country_name}`;
  } catch (error) {
    console.error('Error fetching location from iplocation.net:', error);
    return 'Unknown location'; 
  }
};
  