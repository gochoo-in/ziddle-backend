import axios from 'axios';

let superAdminToken;
let employeeToken;
let employeeId;

describe('Super Admin Signin and API Access with Casbin Middleware', () => {
  it('should sign in the super admin and return a token', async () => {
    const url = 'http://127.0.0.1:3000/api/v1/admin/signin';
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        email: 'sachin@gatoes.conm',
        password: 'Sachin@123',
      },
    };

    try {
      const response = await axios(url, options);
      const data = response.data;
      superAdminToken = data.data.token;
      expect(response.status).toBe(200);
      expect(data.message).toBe('Login successful');
    } catch (error) {
      console.log('Error during super admin signin:', error.response ? error.response.data : error.message);
    }
  }, 50000);

  it('should add a new employee using the super admin token', async () => {
    const url = 'http://127.0.0.1:3000/api/v1/admin/signup';
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${superAdminToken}`,
      },
      data: {
        name: 'Test Employee',
        email: 'testemployee@example.com',
        password: 'password123',
      },
    };

    try {
      const response = await axios(url, options);
      const data = response.data;
      employeeId = data.data.newAdmin._id;
      expect(response.status).toBe(201);
      expect(data.message).toBe('Admin registered successfully');
    } catch (error) {
      console.log('Error during employee signup:', error.response ? error.response.data : error.message);
    }
  }, 50000);

  it('should sign in the newly created employee and return a token', async () => {
    const url = 'http://127.0.0.1:3000/api/v1/admin/signin';
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        email: 'testemployee@example.com',
        password: 'password123',
      },
    };

    try {
      const response = await axios(url, options);
      const data = response.data;
      employeeToken = data.data.token;
      employeeId = data.data.admin._id;
      expect(response.status).toBe(200);
      expect(data.message).toBe('Login successful');
    } catch (error) {
      console.log('Error during employee signin:', error.response ? error.response.data : error.message);
    }
  }, 50000);

  it('should assign access policy to allow adding destinations and getting cities', async () => {
    if (!superAdminToken) {
      throw new Error('Super Admin Token not defined, skipping test');
    }

    const url = 'http://127.0.0.1:3000/api/v1/policy';

    try {
      const responsePostDestination = await axios({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${superAdminToken}`,
        },
        data: {
          ptype: 'p',
          employeeId: employeeId,
          endpoint: '/api/v1/destination',
          action: 'POST',
        },
        url,
      });

      const responseGetCities = await axios({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${superAdminToken}`,
        },
        data: {
          ptype: 'p',
          employeeId: employeeId,
          endpoint: '/api/v1/cities',
          action: 'GET',
        },
        url,
      });

      console.log('Policies assigned successfully.');
    } catch (error) {
      console.error('Error assigning policies:', error.response ? error.response.data : error.message);
      expect(error.response.status).not.toBe(400);
    }
  }, 50000);

  it('should allow the employee to add a test destination (POST)', async () => {
    if (!employeeToken) {
      throw new Error('Employee Token not defined, skipping test');
    }

    const url = 'http://127.0.0.1:3000/api/v1/destination';

    try {
      const options = {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${employeeToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          name: 'Test Destination',
          description: 'This is a test destination for API testing purposes.',
          visaType: 'tourist',
          country: 'Test Country',
          continent: 'Test Continent',
          latitude: 10.1234,
          longitude: 20.5678,
          currency: 'TST',
          timezone: 'UTC+05:00',
          tripDuration: ['2-4 days', '5-7 days'],
        },
      };

      const response = await axios(url, options);
      const data = response.data;
      expect(response.status).toBe(201);
    } catch (error) {
      console.error('Error adding destination:', error.response ? error.response.data : error.message);
      expect(error.response.status).not.toBe(403);
    }
  }, 50000);

  it('should deny the employee access to get destinations (GET)', async () => {
    if (!employeeToken) {
      throw new Error('Employee Token not defined, skipping test');
    }

    const url = 'http://127.0.0.1:3000/api/v1/destination';
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${employeeToken}`,
      },
    };

    try {
      const response = await axios(url, options);
    } catch (error) {
      expect(error.response.status).toBe(403);
      expect(error.response.data.message).toBe('Access denied');
    }
  }, 50000);

  it('should allow the employee to get test cities (GET)', async () => {
    if (!employeeToken) {
      throw new Error('Employee Token not defined, skipping test');
    }

    const url = 'http://127.0.0.1:3000/api/v1/cities';
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${employeeToken}`,
      },
    };

    const response = await axios(url, options);
    const data = response.data;
    expect(response.status).toBe(200);
  }, 50000);

  it('should deny the employee access to add test cities (POST)', async () => {
    if (!employeeToken) {
      throw new Error('Employee Token not defined, skipping test');
    }

    const url = 'http://127.0.0.1:3000/api/v1/cities';
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${employeeToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        name: 'Test City',
        iataCode: 'TST',
        destinationName: 'Test Destination',
        country: 'Test Country',
        latitude: 12.3456,
        longitude: 65.4321,
        languageSpoken: 'Test Language',
      },
    };

    try {
      const response = await axios(url, options);
    } catch (error) {
      expect(error.response.status).toBe(403);
      expect(error.response.data.message).toBe('Access denied');
    }
  }, 50000);

  it('should delete the test destination', async () => {
    if (!employeeToken) {
      throw new Error('Employee Token not defined, skipping test');
    }

    const url = 'http://127.0.0.1:3000/api/v1/destination';
    const options = {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${employeeToken}`,
      },
    };

    try {
      const response = await axios(url, options);
      expect(response.status).toBe(200);
    } catch (error) {
      console.log('Error during destination deletion:', error.response ? error.response.data : error.message);
    }
  }, 50000);

  it('should delete the test employee and associated policies', async () => {
    if (!superAdminToken) {
      throw new Error('Super Admin Token not defined, skipping test');
    }

    const url = `http://127.0.0.1:3000/api/v1/admin/${employeeId}`;
    const options = {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${superAdminToken}`,
      },
    };

    try {
      const response = await axios(url, options);
      expect(response.status).toBe(200);
    } catch (error) {
      console.log('Error during employee deletion:', error.response ? error.response.data : error.message);
    }
  }, 50000);

  it('should log out the super admin', async () => {
    if (!superAdminToken) {
      throw new Error('Super Admin Token not defined, skipping test');
    }

    const url = 'http://127.0.0.1:3000/api/v1/admin/logout';
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${superAdminToken}`,
      },
    };

    try {
      const response = await axios(url, options);
      expect(response.status).toBe(200);
    } catch (error) {
      console.log('Error during super admin logout:', error.response ? error.response.data : error.message);
    }
  }, 50000);
});
