import axios from "axios";
import dotenv from "dotenv";
import logger from "../config/logger.js";

dotenv.config();

const BASE_URL = process.env.BASE_URL;
let testUserToken;
let userId;
let contactId;

describe("Profiles API Tests", () => {

// ---------------------------------------------------- SIGN IN A USER ------------------------------------------------------------//
  it("should sign in the test user and retrieve a token", async () => {
    try {
      // Step 1: Trigger OTP request for the test user
      const signinUrl = `${BASE_URL}/auth/signin`;
      const signinOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        data: { phoneNumber: "1111122222" },
      };

      await axios(signinUrl, signinOptions);

      // Step 2: Sign in with OTP 1111
      const otpSigninOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        data: { phoneNumber: "1111122222", otp: "1111" },
      };

      const response = await axios(signinUrl, otpSigninOptions);
      testUserToken = response.data.token;
      userId = response.data.data.user._id; // Store the user ID for later tests

      logger.info("Test user signed in successfully.");
      expect(response.status).toBe(200);
    } catch (error) {
      logger.error("Error during user sign-in:", error.response?.data || error.message);
      throw error;
    }
  });

// ---------------------------------------------------- CREATE NEW PROFILE ------------------------------------------------------------//
  it("should create a new profile for the user", async () => {
    const url = `${BASE_URL}/profile/${userId}`;
    const options = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${testUserToken}`,
        "Content-Type": "application/json",
      },
      data: {
        preferredLanguage: "English",
        address: {
          line1: "123",
          line2: "Main St",
          nationality: "Indian",
          pincode: "123456",
        },
      },
    };

    try {
      const response = await axios(url, options);
      logger.info("Profile created successfully.");
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
    } catch (error) {
      logger.error("Error creating profile:", error.response?.data || error.message);
      throw error;
    }
  });

// ---------------------------------------------------- GET USER'S PROFILE ------------------------------------------------------------//
  it("should retrieve the user's profile", async () => {
    const url = `${BASE_URL}/profile/${userId}`;
    const options = {
      method: "GET",
      headers: {
        Authorization: `Bearer ${testUserToken}`,
      },
    };

    try {
      const response = await axios(url, options);
      logger.info("Profile retrieved successfully.");
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.profile.user).toBe(userId);
    } catch (error) {
      logger.error("Error retrieving profile:", error.response?.data || error.message);
      throw error;
    }
  });

// ---------------------------------------------------- UPDATE USER'S PROFILE ------------------------------------------------------------//
  it("should update the user's profile", async () => {
    const url = `${BASE_URL}/profile/${userId}`;
    const options = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${testUserToken}`,
        "Content-Type": "application/json",
      },
      data: {
        address: {
          line1: "456 Updated St",
          pincode: "654321",
        },
      },
    };

    try {
      const response = await axios(url, options);
      logger.info("Profile updated successfully.");
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    } catch (error) {
      logger.error("Error updating profile:", error.response?.data || error.message);
      throw error;
    }
  });

// ---------------------------------------------------- ADD A NEW CONTACT FOR A USER ------------------------------------------------------------//
  it("should add a new contact for the user", async () => {
    const url = `${BASE_URL}/profile/${userId}/addContact`;
    const options = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${testUserToken}`,
        "Content-Type": "application/json",
      },
      data: {
        salutation: "Mr.",
        firstName: "John",
        surname: "Doe",
        dob: "1990-01-01",
        passport: {
          passportNumber: "A1234567",
          expiryDate: "2030-01-01",
        },
      },
    };

    try {
      const response = await axios(url, options);
      contactId = response.data.data.contact._id; // Store the contact ID for later tests
      logger.info("Contact added successfully.");
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
    } catch (error) {
      logger.error("Error adding contact:", error.response?.data || error.message);
      throw error;
    }
  });

// ---------------------------------------------------- GET CONTACTS ------------------------------------------------------------//
  it("should retrieve all contacts for the user", async () => {
    const url = `${BASE_URL}/profile/${userId}/contact`;
    const options = {
      method: "GET",
      headers: {
        Authorization: `Bearer ${testUserToken}`,
      },
    };

    try {
      const response = await axios(url, options);
      logger.info("Contacts retrieved successfully.");
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.contacts.length).toBeGreaterThan(0);
    } catch (error) {
      logger.error("Error retrieving contacts:", error.response?.data || error.message);
      throw error;
    }
  });

// ---------------------------------------------------- UPDATE CONTACT ------------------------------------------------------------//
  it("should update an existing contact for the user", async () => {
    const url = `${BASE_URL}/profile/${userId}/contact/${contactId}`;
    const options = {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${testUserToken}`,
        "Content-Type": "application/json",
      },
      data: {
        firstName: "Updated John",
        passport: {
          passportNumber: "B7654321",
        },
      },
    };

    try {
      const response = await axios(url, options);
      logger.info("Contact updated successfully.");
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.contact.firstName).toBe("Updated John");
    } catch (error) {
      logger.error("Error updating contact:", error.response?.data || error.message);
      throw error;
    }
  });

// ---------------------------------------------------- DELETE CONTACT ------------------------------------------------------------//
  it("should delete a contact for the user", async () => {
    const url = `${BASE_URL}/profile/${userId}/contact/${contactId}`;
    const options = {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${testUserToken}`,
      },
    };

    try {
      const response = await axios(url, options);
      logger.info("Contact deleted successfully.");
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    } catch (error) {
      logger.error("Error deleting contact:", error.response?.data || error.message);
      throw error;
    }
  });

// ---------------------------------------------------- DELETE USER PROFILE ------------------------------------------------------------//
  it("should delete the user's profile", async () => {
    const url = `${BASE_URL}/profile/${userId}`;
    const options = {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${testUserToken}`,
      },
    };

    try {
      const response = await axios(url, options);
      logger.info("Profile deleted successfully.");
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    } catch (error) {
      logger.error("Error deleting profile:", error.response?.data || error.message);
      throw error;
    }
  });

// ---------------------------------------------------- LOG OUT USER ------------------------------------------------------------//
  it("should log out the test user successfully", async () => {
    const logoutUrl = `${BASE_URL}/auth/logout`;
    const options = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${testUserToken}`, 
        "Content-Type": "application/json",
      },
    };
  
    try {
      const response = await axios(logoutUrl, options);
  
      logger.info("User logged out successfully.");
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.message).toBe("Logout successful");
    } catch (error) {
      logger.error("Error during logout:", error.response?.data || error.message);
      throw error;
    }
  });
  
});
