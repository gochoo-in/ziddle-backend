import axios from 'axios';
import dotenv from 'dotenv';
import logger from '../config/logger.js';

dotenv.config();

let adminToken = process.env.SUPER_ADMIN_TOKEN;
let countryId;
const BASE_URL = process.env.BASE_URL;

describe('Country CRUD Operations Tests', () => {

// ---------------------------------------------------- GET COUNTRIES ------------------------------------------------------------//
  it('should retrieve all countries', async () => {
    const url = `${BASE_URL}/country`;
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
      },
    };

    try {
      const response = await axios(url, options);
      logger.info('Countries retrieved successfully');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.data)).toBe(true);
    } catch (error) {
      logger.error('Error retrieving countries:', error.response ? error.response.data : error.message);
    }
  }, 50000);

// ---------------------------------------------------- ADD COUNTRY ------------------------------------------------------------//
  it('should add a new country with required fields', async () => {
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
      countryId = response.data.data._id;  // Store the country ID for future operations
      logger.info('Country added successfully:', countryId);
      expect(response.status).toBe(201);
      expect(response.data.message).toBe('Country added successfully');
    } catch (error) {
      logger.error('Error adding country:', error.response ? error.response.data : error.message);
      expect(error.response.status).not.toBe(400);
    }
  }, 50000);

// ---------------------------------------------------- UPDATE COUNTRY DETAILS ------------------------------------------------------------//
  it('should update the country details', async () => {
    const url = `${BASE_URL}/country/${countryId}`;
    const options = {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        currency: 'TST_UPDATED',
        mobileCode: '+999',
      },
    };

    try {
      const response = await axios(url, options);
      logger.info('Country updated successfully');
      expect(response.status).toBe(200);
      expect(response.data.data.currency).toBe('TST_UPDATED');
      expect(response.data.data.mobileCode).toBe('+999');
    } catch (error) {
      logger.error('Error updating country:', error.response ? error.response.data : error.message);
    }
  }, 50000);

// ---------------------------------------------------- DELETE COUNTRY AND ASSOCIATED CITIES ------------------------------------------------------------//
  it('should delete the country and associated cities', async () => {
    const url = `${BASE_URL}/country/${countryId}`;
    const options = {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
      },
    };

    try {
      const response = await axios(url, options);
      logger.info('Country deleted successfully:', countryId);
      expect(response.status).toBe(200);
      expect(response.data.message).toBe('Country and its associated cities deleted successfully');
    } catch (error) {
      logger.error('Error deleting country:', error.response ? error.response.data : error.message);
      expect(error.response.status).not.toBe(500);
    }
  }, 50000);

});
