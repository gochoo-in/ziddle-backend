import axios from "axios";
import dotenv from "dotenv";
import logger from "../config/logger.js";

dotenv.config();

const BASE_URL = process.env.BASE_URL;
let adminToken = process.env.SUPER_ADMIN_TOKEN;
let employeeId;
let policyId;

describe("Policy Management Tests", () => {
  beforeAll(async () => {
    logger.info("Starting Policy Management Tests");
  });

  afterAll(async () => {
    logger.info("Cleaning up Policy Management Tests");
  });

// ---------------------------------------------------- CREATE EMPLOYEE ------------------------------------------------------------//
  it("should create an employee", async () => {
    const url = `${BASE_URL}/admin/signup`;
    const data = {
      name: "Test Employee",
      email: `employee${Date.now()}@example.com`,
      phone: "9876543210",
      password: "password123",
    };

    const options = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      data,
    };

    try {
      const response = await axios(url, options);
      employeeId = response.data.data.newAdmin._id;

      logger.info(`Employee created successfully: ${employeeId}`);
      expect(response.status).toBe(201);
      expect(employeeId).toBeDefined();
    } catch (error) {
      logger.error("Error creating employee:", error.response?.data || error.message);
      expect(error.response?.status).not.toBe(500);
    }
  }, 50000);

// ---------------------------------------------------- ASSIGN POLICIES ------------------------------------------------------------//
  it("should assign policies to the employee", async () => {
    const url = `${BASE_URL}/policy`;
    const policies = [
      {
        employeeId,
        endpoint: "/api/v1/destinations",
        action: "GET",
      },
      {
        employeeId,
        endpoint: "/api/v1/destination/*/cities",
        action: "POST",
      },
    ];

    const options = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      data: policies,
    };

    try {
      const response = await axios(url, options);

      logger.info(`Policies assigned successfully for employee: ${employeeId}`);
      expect(response.status).toBe(201);
    } catch (error) {
      logger.error("Error assigning policies:", error.response?.data || error.message);
      expect(error.response?.status).not.toBe(500);
    }
  }, 500000);

// ---------------------------------------------------- FETCH POLICIES ------------------------------------------------------------//
  it("should fetch all policies for the employee", async () => {
    const url = `${BASE_URL}/policy/${employeeId}`;

    const options = {
      method: "GET",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
    };

    try {
      const response = await axios(url, options);

      const policies = response.data.data.employeePolicies;
      logger.info(`Policies fetched for employee: ${employeeId}`);
      expect(response.status).toBe(200);
      expect(policies).toBeDefined();
      expect(policies.length).toBeGreaterThan(0);

      policyId = policies[0]._id; // Save one policy ID for further tests
    } catch (error) {
      logger.error("Error fetching employee policies:", error.response?.data || error.message);
      expect(error.response?.status).not.toBe(500);
    }
  }, 500000);

// ---------------------------------------------------- UPDATE POLICIES ------------------------------------------------------------//
  it("should update a policy for the employee", async () => {
    const url = `${BASE_URL}/policy/${policyId}`;
    const updatedPolicy = {
      ptype: "p",
      employeeId,
      endpoint: "/destinations",
      action: "POST",
    };

    const options = {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      data: updatedPolicy,
    };

    try {
      const response = await axios(url, options);

      logger.info(`Policy updated successfully: ${policyId}`);
      expect(response.status).toBe(200);
      expect(response.data.data.updatedPolicy.v2).toBe("POST");
    } catch (error) {
      logger.error("Error updating policy:", error.response?.data || error.message);
      expect(error.response?.status).not.toBe(500);
    }
  }, 500000);

// ---------------------------------------------------- DELETE POLICIES ------------------------------------------------------------//
  it("should delete policies for the employee", async () => {
    const url = `${BASE_URL}/policy/remove`;
    const policiesToRemove = [
      { v1: "/destinations", v2: "POST" },
      { v1: "/cities", v2: "POST" },
    ];

    const options = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      data: {
        employeeId,
        policies: policiesToRemove,
      },
    };

    try {
      const response = await axios(url, options);

      logger.info(`Policies removed successfully for employee: ${employeeId}`);
      expect(response.status).toBe(200);
    } catch (error) {
      logger.error("Error removing policies:", error.response?.data || error.message);
      expect(error.response?.status).not.toBe(500);
    }
  }, 500000);

// ---------------------------------------------------- DELETE EMPLOYEE ------------------------------------------------------------//
  it("should delete the employee", async () => {
    const url = `${BASE_URL}/admin/${employeeId}`;

    const options = {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
    };

    try {
      const response = await axios(url, options);

      logger.info(`Employee deleted successfully: ${employeeId}`);
      expect(response.status).toBe(200);
    } catch (error) {
      logger.error("Error deleting employee:", error.response?.data || error.message);
      expect(error.response?.status).not.toBe(500);
    }
  });
}, 500000);
