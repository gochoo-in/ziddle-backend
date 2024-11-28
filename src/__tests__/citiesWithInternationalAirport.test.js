import axios from 'axios';
import dotenv from 'dotenv';
import logger from '../config/logger.js';

dotenv.config();

let adminToken = process.env.SUPER_ADMIN_TOKEN;
let countryId;
let cityId;
const BASE_URL = process.env.BASE_URL;

describe('International Airport City CRUD Operations Tests', () => {

  beforeAll(async () => {
    const url = `${BASE_URL}/country`;
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        name: 'Test Country',
        isoCode: 'TC',
        currency: 'TST',
        mobileCode: '+123',
      },
    };

    try {
      const response = await axios(url, options);
      countryId = response.data.data._id;
      logger.info('Test Country created successfully:', countryId);
    } catch (error) {
      logger.error('Error creating country for testing cities:', error.response ? error.response.data : error.message);
    }
  }, 500000);

// ---------------------------------------------------- GET CITIES WITH INTERNATIONAL AIRPORT ------------------------------------------------------------//
  it('should retrieve all international airport cities', async () => {
    const url = `${BASE_URL}/internationalAirportCities`;
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
      },
    };

    try {
      const response = await axios(url, options);
      logger.info('Cities retrieved successfully');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.data)).toBe(true);
    } catch (error) {
      logger.error('Error retrieving cities:', error.response ? error.response.data : error.message);
    }
  }, 500000);

// ---------------------------------------------------- ADD CITY WITH INTERNATIONAL AIRPORT ------------------------------------------------------------//
  it('should add a new international airport city', async () => {
    const url = `${BASE_URL}/internationalAirportCities`;
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        name: 'Test City',
        iataCode: 'TCT',
        country: countryId,
      },
    };

    try {
      const response = await axios(url, options);
      cityId = response.data.data._id;  // Store the city ID for future operations
      logger.info('International Airport City added successfully:', cityId);
      expect(response.status).toBe(201);
      expect(response.data.message).toBe('City added successfully');
    } catch (error) {
      logger.error('Error adding city:', error.response ? error.response.data : error.message);
      expect(error.response.status).not.toBe(400);
    }
  }, 500000);

// ---------------------------------------------------- GET CITIES WITH COUNTRY ID ------------------------------------------------------------//
  it('should retrieve cities by country ID', async () => {
    const url = `${BASE_URL}/internationalAirportCities/${countryId}`;
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
      },
    };

    try {
      const response = await axios(url, options);
      logger.info('Cities for the country retrieved successfully');
      expect(response.status).toBe(200);
      expect(response.data.data.length).toBeGreaterThan(0);
    } catch (error) {
      logger.error('Error retrieving cities for country:', error.response ? error.response.data : error.message);
    }
  }, 500000);

// ---------------------------------------------------- UPDATE INTERNATIONAL AIRPORT CITY ------------------------------------------------------------//
  it('should update an international airport city', async () => {
    const url = `${BASE_URL}/internationalAirportCities/${cityId}`;
    const options = {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        iataCode: 'TCT_UPDATED',
        name: 'Test City Updated',
      },
    };

    try {
      const response = await axios(url, options);
      logger.info('City updated successfully');
      expect(response.status).toBe(200);
      expect(response.data.data.iataCode).toBe('TCT_UPDATED');
      expect(response.data.data.name).toBe('Test City Updated');
    } catch (error) {
      logger.error('Error updating city:', error.response ? error.response.data : error.message);
    }
  }, 500000);

// ---------------------------------------------------- DELETE INTERATIONAL AIRPORT CITY ------------------------------------------------------------//
  it('should delete an international airport city', async () => {
    const url = `${BASE_URL}/internationalAirportCities/${cityId}`;
    const options = {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
      },
    };

    try {
      const response = await axios(url, options);
      logger.info('City deleted successfully:', cityId);
      expect(response.status).toBe(200);
      expect(response.data.message).toBe('City deleted successfully');
    } catch (error) {
      logger.error('Error deleting city:', error.response ? error.response.data : error.message);
      expect(error.response.status).not.toBe(500);
    }
  }, 500000);

// ---------------------------------------------------- GET INDIAN CITIES WITH INTERNATIONAL AIRPORTS ------------------------------------------------------------//
  it('should retrieve all cities in India', async () => {
    const url = `${BASE_URL}/internationalAirportCities/india`;
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
      },
    };

    try {
      const response = await axios(url, options);
      logger.info('Indian cities retrieved successfully');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.data)).toBe(true);
      expect(response.data.message).toBe('Fetched Indian cities successfully');
    } catch (error) {
      logger.error('Error retrieving Indian cities:', error.response ? error.response.data : error.message);
    }
  }, 500000);

});
