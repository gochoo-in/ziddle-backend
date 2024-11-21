import axios from 'axios';
import dotenv from 'dotenv';
import logger from '../config/logger.js';

dotenv.config();

let adminToken = process.env.SUPER_ADMIN_TOKEN;
let destinationId;
const BASE_URL = process.env.BASE_URL;

describe('Destination Management Tests', () => {
    beforeAll(async () => {
        // Authenticate and acquire admin token
        const url = `${BASE_URL}/admin/signin`;
        const options = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            data: {
                email: process.env.SUPER_ADMIN_EMAIL,
                password: process.env.SUPER_ADMIN_PASSWORD,
            },
        };

        try {
            const response = await axios(url, options);
            adminToken = response.data.data.token;
            logger.info('Super Admin Token acquired for destinations:', adminToken);
        } catch (error) {
            logger.error('Error during admin signin for destinations:', error.response ? error.response.data : error.message);
        }
    }, 50000);

    it('should add a new destination successfully', async () => {
        const url = `${BASE_URL}/destination`;
        const options = {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json',
            },
            data: {
                name: 'Test Destination',
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
            destinationId = response.data.data.data._id; // Save destination ID for later use
            logger.info('Destination added successfully:', destinationId);
            expect(response.status).toBe(201);
        } catch (error) {
            logger.error('Error adding destination:', error.response ? error.response.data : error.message);
            expect(error.response.status).not.toBe(500);
        }
    }, 10000);

    it('should retrieve all destinations', async () => {
        const url = `${BASE_URL}/destination`;
        const options = {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
            },
        };

        try {
            const response = await axios(url, options);
            logger.info('All destinations retrieved successfully');
            expect(response.status).toBe(200);
            expect(response.data.data.data).toBeInstanceOf(Array);
        } catch (error) {
            logger.error('Error retrieving destinations:', error.response ? error.response.data : error.message);
        }
    }, 10000);

    it('should retrieve the destination by ID', async () => {
        const url = `${BASE_URL}/destination/${destinationId}`;
        const options = {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
            },
        };

        try {
            const response = await axios(url, options);
            logger.info('Destination retrieved successfully:', destinationId);
            expect(response.status).toBe(200);
            expect(response.data.data.destination._id).toBe(destinationId);
        } catch (error) {
            logger.error('Error retrieving destination by ID:', error.response ? error.response.data : error.message);
        }
    }, 10000);

    it('should update the destination details', async () => {
        const url = `${BASE_URL}/destination/${destinationId}`;
        const options = {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json',
            },
            data: {
                name: 'Updated Test Destination',
                description: 'Updated description',
            },
        };

        try {
            const response = await axios(url, options);
            logger.info('Destination updated successfully:', destinationId);
            expect(response.status).toBe(200);
            expect(response.data.data.destination.name).toBe('Updated Test Destination');
            expect(response.data.data.destination.description).toBe('Updated description');
        } catch (error) {
            logger.error('Error updating destination:', error.response ? error.response.data : error.message);
        }
    }, 10000);

    it('should toggle the destination’s active status', async () => {
        const url = `${BASE_URL}/destination/${destinationId}/toggleDestinationActiveStatus`;
        const options = {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
            },
        };

        try {
            const response = await axios(url, options);
            logger.info('Destination active status toggled successfully');
            expect(response.status).toBe(200);
        } catch (error) {
            logger.error('Error toggling destination active status:', error.response ? error.response.data : error.message);
            expect(error.response.status).not.toBe(500);
        }
    }, 10000);

    it('should retrieve cities by destination ID', async () => {
        const url = `${BASE_URL}/destination/${destinationId}/cities`;
        const options = {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
            },
        };

        try {
            const response = await axios(url, options);
            logger.info('Cities for destination retrieved successfully');
            expect(response.status).toBe(200);
            expect(response.data.data.cities).toBeInstanceOf(Array);
        } catch (error) {
            logger.error('Error retrieving cities by destination:', error.response ? error.response.data : error.message);
        }
    }, 10000);

    it('should delete the destination and associated cities and activities', async () => {
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
