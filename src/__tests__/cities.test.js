import axios from 'axios';
import dotenv from 'dotenv';
import logger from '../config/logger.js';

dotenv.config();

let adminToken = process.env.SUPER_ADMIN_TOKEN;
let destinationId;
let cityId;
const BASE_URL = process.env.BASE_URL;

describe('City Management Tests', () => {


  it('should add a new destination successfully', async () => {
    const url = `${BASE_URL}/destination`;
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        name: 'Test Destination for city',
        currency: 'TST',
        timezone: 'UTC+05:00',
        tripDuration: ['3-5 days'],
        description: 'A destination for testing',
        visaType: 'tourist',
        country: 'Test Country',
        continent: 'Test Continent',
        latitude: 10.1234,
        longitude: 20.5678,
        markup: 15,
      },
    };

    try {
      const response = await axios(url, options);
      destinationId = response.data.data.data._id;
      logger.info('Destination added successfully:', destinationId);
      expect(response.status).toBe(201);
    } catch (error) {
      logger.error('Error adding destination:', error.response ? error.response.data : error.message);
      expect(error.response.status).not.toBe(500);
    }
  }, 10000);


  it('should create a new city associated with the destination', async () => {
    const url = `${BASE_URL}/cities`;
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        name: 'Test City for city',
        iataCode: 'TCT',
        destinationId: destinationId,
        country: 'Test Country',
        latitude: 15.6789,
        longitude: 25.1234,
        languageSpoken: 'English',
        hotelApiCityName: 'Test City for city'
      },
    };

    try {
      const response = await axios(url, options);
      cityId = response.data.data.city._id;
      logger.info('City created successfully:', cityId);
      expect(response.status).toBe(201);
    } catch (error) {
      logger.error('Error creating city:', error.response ? error.response.data : error.message);
      expect(error.response.status).not.toBe(400);
    }
  }, 10000);

  it('should retrieve all cities', async () => {
    const url = `${BASE_URL}/cities`;
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
      },
    };

    try {
      const response = await axios(url, options);
      logger.info('All cities retrieved successfully');
      expect(response.status).toBe(200);
      expect(response.data.data.cities).toBeInstanceOf(Array);
    } catch (error) {
      logger.error('Error retrieving cities:', error.response ? error.response.data : error.message);
    }
  }, 10000);

  it('should retrieve the city with activities', async () => {
    const url = `${BASE_URL}/cities/${cityId}/activities`;
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
      },
    };

    try {
      const response = await axios(url, options);
      logger.info('City with activities retrieved successfully');
      expect(response.status).toBe(200);
    } catch (error) {
      logger.error('Error retrieving city with activities:', error.response ? error.response.data : error.message);
    }
  }, 10000);

  it('should update the city details', async () => {
    const url = `${BASE_URL}/cities/${cityId}`;
    const options = {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        name: 'Updated Test City',
        languageSpoken: 'French',
      },
    };

    try {
      const response = await axios(url, options);
      logger.info('City updated successfully');
      expect(response.status).toBe(200);
      expect(response.data.data.city.name).toBe('Updated Test City');
      expect(response.data.data.city.languageSpoken).toBe('French');
    } catch (error) {
      logger.error('Error updating city:', error.response ? error.response.data : error.message);
    }
  }, 10000);

  it('should toggle the city’s active status', async () => {
    const url = `${BASE_URL}/cities/${cityId}/toggle-city-active`;
    const options = {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
      },
    };

    try {
      const response = await axios(url, options);
      logger.info('City active status toggled successfully');
      expect(response.status).toBe(200);
    } catch (error) {
      logger.error('Error toggling city active status:', error.response ? error.response.data : error.message);
      expect(error.response.status).not.toBe(500);
    }
  }, 10000);


  it('should delete the destination with associated cities', async () => {
    const url = `${BASE_URL}/destination/${destinationId}`;
    const options = {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
      },
    };

    try {
      const response = await axios(url, options);
      logger.info('Destination deleted successfully:', destinationId);
      expect(response.status).toBe(200);
    } catch (error) {
      logger.error('Error deleting destination:', error.response ? error.response.data : error.message);
      expect(error.response.status).not.toBe(500);
    }
  }, 10000);


});
