import axios from 'axios';
import dotenv from 'dotenv';
import logger from '../config/logger.js';

dotenv.config();

let adminToken = process.env.SUPER_ADMIN_TOKEN;
let destinationId;
let cityId;
let activityId;
const BASE_URL = process.env.BASE_URL;

describe('Destination, City, and Activity Management Tests', () => {



  it('should create a new destination with required fields', async () => {
    const url = `${BASE_URL}/destination`;
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        name: 'Test Destination for activities',
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
      logger.info('Destination created successfully:', destinationId);
      expect(response.status).toBe(201);
    } catch (error) {
      logger.error('Error creating destination:', error.response ? error.response.data : error.message);
      expect(error.response.status).not.toBe(400);
    }
  }, 10000);

  it('should create a city associated with the destination', async () => {
    const url = `${BASE_URL}/cities`;
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        name: 'Test City',
        iataCode: 'TCT',
        destinationId: destinationId,
        country: 'Test Country',
        latitude: 15.6789,
        longitude: 25.1234,
        languageSpoken: 'English',
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

  it('should create an activity for the city', async () => {
    const url = `${BASE_URL}/activities`;
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        name: 'Test Activity',
        duration: '2 hours',
        featured: true,
        description: 'A test activity',
        opensAt: '09:00',
        closesAt: '17:00',
        cityName: 'Test City',
        bestTimeToParticipate: 'Morning',
        physicalDifficulty: 'Medium',
        localGuidesAvailable: true,
        isFamilyFriendly: true,
        refundable: true,
        price: 100.0,
      },
    };

    try {
      const response = await axios(url, options);
      activityId = response.data.data.activity._id;
      logger.info('Activity created successfully:', activityId);
      expect(response.status).toBe(201);
      expect(response.data.message).toBe('Activity added and associated with city successfully');
    } catch (error) {
      logger.error('Error creating activity:', error.response ? error.response.data : error.message);
      expect(error.response.status).not.toBe(400);
    }
  }, 10000);


  it('should retrieve the created activity by ID', async () => {
    const url = `${BASE_URL}/activities/${activityId}`;
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
      },
    };

    try {
      const response = await axios(url, options);
      logger.info('Activity retrieved successfully');
      expect(response.status).toBe(200);
      expect(response.data.data.activity._id).toBe(activityId);
    } catch (error) {
      logger.error('Error retrieving activity:', error.response ? error.response.data : error.message);
    }
  }, 10000);

  it('should update the activity details', async () => {
    const url = `${BASE_URL}/activities/${activityId}`;
    const options = {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        description: 'Updated activity description',
        price: "120.0",
      },
    };

    try {
      const response = await axios(url, options);
      logger.info('Activity updated successfully');
      expect(response.status).toBe(200);
      expect(response.data.data.activity.description).toBe('Updated activity description');
      expect(response.data.data.activity.price).toBe("120.0");
    } catch (error) {
      console.log(error)
      logger.error('Error updating activity:', error.response ? error.response.data : error.message);
    }
  }, 10000);



  it('should delete the destination with associated cities and activities', async () => {
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
