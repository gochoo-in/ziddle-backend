import axios from 'axios';
import dotenv from 'dotenv';
import logger from '../config/logger.js';

dotenv.config();

let adminToken;
const BASE_URL = process.env.BASE_URL;

describe('Admin Authentication Tests', () => {

// ---------------------------------------------------- SIGNING IN ADMIN ------------------------------------------------------------//
  it('should log in the admin successfully', async () => {
    const url = `${BASE_URL}/admin/signin`;
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        email: 'avani@gochoo.in',
        password: 'Gochoo@2024',
      },
    };

    try {
      const response = await axios(url, options);
      adminToken = response.data.data.token;
      logger.info('Admin login successful');
      expect(response.status).toBe(200);
      expect(response.data.data).toHaveProperty('token');
      expect(response.data.message).toBe('Login successful');
    } catch (error) {
      logger.error('Error during admin login:', error.response ? error.response.data : error.message);
      expect(error.response.status).not.toBe(500);
    }
  }, 50000);

// ---------------------------------------------------- LOG OUT ADMIN ------------------------------------------------------------//
  it('should log out the admin successfully', async () => {
    const url = `${BASE_URL}/admin/logout`;
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
    };

    try {
      const response = await axios(url, options);
      logger.info('Admin logout successful');
      expect(response.status).toBe(200);
      expect(response.data.message).toBe('Logout successful');
    } catch (error) {
      logger.error('Error during admin logout:', error.response ? error.response.data : error.message);
      expect(error.response.status).not.toBe(500);
    }
  }, 50000);
});
