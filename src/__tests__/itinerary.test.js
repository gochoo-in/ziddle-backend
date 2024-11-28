import axios from "axios";
import dotenv from "dotenv";
import logger from "../config/logger.js";

dotenv.config();

let adminToken = process.env.SUPER_ADMIN_TOKEN;
let testUserToken = process.env.TEST_USER_TOKEN
let destinationId;
let city1Id, city2Id, city3Id, city4Id, city5Id, city6Id;
let activity1Id, activity2Id, activity3Id, activity4Id, activity5Id, replacementActivityId;
let couponlessDiscountId, generalDiscountId;
let itineraryId, leadId, employeeId;
const BASE_URL = process.env.BASE_URL;

async function getGptActivityIdForActivity1(itineraryId, activity1Id) {
  const url = `${BASE_URL}/itinerary/${itineraryId}/activities`;
  const options = {
    method: "GET",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
  };

  try {
    const response = await axios(url, options);
    const activities = response.data.data.activities;


    // Try to find activity in detailedActivity first
    let activity = activities.find(
      a => a.detailedActivity && a.detailedActivity._id === activity1Id
    );

    if (!activity) {
      // Fallback: Try to match in gptActivity if replacement has occurred
      console.warn(
        `Activity1Id "${activity1Id}" not found in detailedActivity. Checking GPT activities...`
      );

      activity = activities.find(
        a => a.gptActivity && a.gptActivity.activityId?.toString() === activity1Id

      );

      if (!activity) {
        throw new Error(
          `Activity with ID "${activity1Id}" not found in itinerary or GPT activities.`
        );
      }
    }

    return activity.gptActivity._id; // Return the GPT Activity ID
  } catch (error) {
    console.error("Error fetching GptActivity ID for activity1Id:", error.message);
    throw error;
  }
}

async function getGptActivityIdForReplacementActivity(itineraryId, replacementActivityId) {
  const url = `${BASE_URL}/itinerary/${itineraryId}/activities`;
  const options = {
    method: "GET",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
  };

  try {
    const response = await axios(url, options);
    const activities = response.data.data.activities;


    // Try to find activity in detailedActivity first
    let activity = activities.find(
      a => a.detailedActivity && a.detailedActivity._id === replacementActivityId
    );

    if (!activity) {
      // Fallback: Try to match in gptActivity if replacement has occurred
      console.warn(
        `Activity1Id "${replacementActivityId}" not found in detailedActivity. Checking GPT activities...`
      );

      activity = activities.find(
        a => a.gptActivity && a.gptActivity.activityId?.toString() === replacementActivityId

      );

      if (!activity) {
        throw new Error(
          `Activity with ID "${replacementActivityId}" not found in itinerary or GPT activities.`
        );
      }
    }

    return activity.gptActivity._id; // Return the GPT Activity ID
  } catch (error) {
    console.error("Error fetching GptActivity ID for activity1Id:", error.message);
    throw error;
  }
}

async function fetchItineraryDetails(itineraryId) {
  const url = `${BASE_URL}/itinerary/${itineraryId}`;
  const options = {
    method: "GET",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
  };

  try {
    const response = await axios(url, options);
    return response.data.data.itinerary.enrichedItinerary;
  } catch (error) {
    console.error("Error fetching itinerary details:", error.message);
    throw error;
  }
}


describe("Comprehensive Itinerary Management Tests for India", () => {
  beforeAll(async () => {
    logger.info("Starting Comprehensive Itinerary Tests for India");
  });

  afterAll(async () => {
    logger.info("Cleaning up after tests");
  });
 // --------------------------------------------------- CREATE NEW DESTINATION ------------------------------------------------------//
  it("should create a new destination for India", async () => {
    const url = `${BASE_URL}/destination`;
    const options = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      data: {
        name: "India",
        currency: "INR",
        timezone: "UTC+05:30",
        tripDuration: ["5-15 days"],
        description: "Explore the diverse culture, history, and natural beauty of India.",
        visaType: "tourist",
        country: "India",
        continent: "Asia",
        latitude: 20.5937,
        longitude: 78.9629,
        markup: 15,
      },
    };

    try {
      const response = await axios(url, options);
      destinationId = response.data.data.data._id;
      logger.info(`Destination created for India: ${destinationId}`);
      expect(response.status).toBe(201);
    } catch (error) {
      logger.error("Error creating destination:", error.response ? error.response.data : error.message);
      expect(error.response.status).not.toBe(500);
    }
  }, 500000);

 // ---------------------------------------------------- CREATE CITIES FOR DESTINATION ----------------------------------------------//
  it("should create 7 cities for India", async () => {
    const cities = [
      { name: "Hyderabad", iataCode: "HYD", hotelApiCityName: "Hyderabad, Telangana", nearbyInternationalAirportCity: {
        name: "Hyderabad",
        iataCode: "HYD"
      }},
      { name: "Mumbai", iataCode: "BOM", hotelApiCityName: "Mumbai, Maharashtra", nearbyInternationalAirportCity: {
        name: "Mumbai",
        iataCode: "BOM"
      }},
      { name: "Jaipur", iataCode: "JAI", hotelApiCityName: "Jaipur, Rajasthan", nearbyInternationalAirportCity: {
        name: "Jaipur",
        iataCode: "JAI"
      }},
      { name: "Bangalore", iataCode: "BLR", hotelApiCityName: "Bangalore, Karnataka", nearbyInternationalAirportCity: {
        name: "Bangalore",
        iataCode: "BLR"
      }},
      { name: "Chennai", iataCode: "MAA", hotelApiCityName: "Chennai, Tamil Nadu", nearbyInternationalAirportCity: {
        name: "Chennai",
        iataCode: "MAA"
      }},
      { name: "Kolkata", iataCode: "CCU", hotelApiCityName: "Calcutta, West Bengal", nearbyInternationalAirportCity: {
        name: "Kolkata",
        iataCode: "CCU"
      }},
      { name: "Ahemdabad", iataCode: "AMD", hotelApiCityName: "Ahemdabad, Gujarat", nearbyInternationalAirportCity: {
        name: "Ahemdabad",
        iataCode: "AMD"
      }}
    ];
  
    for (const city of cities) {
      const url = `${BASE_URL}/cities`;
      const options = {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        data: {
          name: city.name,
          iataCode: city.iataCode,
          destinationId: destinationId,
          country: "India",
          hotelApiCityName: city.hotelApiCityName,
          latitude: city.name === "Hyderabad" ? 17.385044 :
            city.name === "Mumbai" ? 19.0760 :
              city.name === "Bangalore" ? 12.9716 :
                city.name === "Jaipur" ? 26.9124 :
                  city.name === "Ahemdabad" ? 23.0225 :
                    city.name === "Chennai" ? 13.0827 : 22.5726,
          longitude: city.name === "Hyderabad" ? 78.486671 :
            city.name === "Mumbai" ? 72.8777 :
              city.name === "Bangalore" ? 77.5946 :
                city.name === "Jaipur" ? 75.7873 :
                  city.name === "Ahemdabad" ? 72.5714 :
                    city.name === "Chennai" ? 80.2707 : 88.3639,
          languageSpoken: "Hindi, English",
          nearbyInternationalAirportCity: {
            name: city.nearbyInternationalAirportCity.name,
            iataCode: city.nearbyInternationalAirportCity.iataCode
          }
        },
      };
  
      try {
        const response = await axios(url, options);
        switch (city.name) {
          case "Hyderabad":
            city1Id = response.data.data.city._id;
            break;
          case "Mumbai":
            city2Id = response.data.data.city._id;
            break;
          case "Jaipur":
            city3Id = response.data.data.city._id;
            break;
          case "Bangalore":
            city4Id = response.data.data.city._id;
            break;
          case "Chennai":
            city5Id = response.data.data.city._id;
            break;
          case "Kolkata":
            city6Id = response.data.data.city._id;
            break;
        }
        logger.info(`City created: ${response.data.data.city.name}`);
        expect(response.status).toBe(201);
      } catch (error) {
        logger.error("Error creating city:", error.response ? error.response.data : error.message);
        expect(error.response.status).not.toBe(500);
      }
    }
  }, 5000000);
  
// --------------------------------------------------- CREATE ACTIVITIES FOR DESTINATION --------------------------------------------//
  it("should create activities for the cities in India", async () => {
    const activities = [
      {
        name: "Visit Charminar",
        cityName: "Hyderabad",
        duration: "2 hours",
        featured: true,
        opensAt: "09:00",
        closesAt: "17:00",
        physicalDifficulty: "Easy",
        localGuidesAvailable: true,
        isFamilyFriendly: true,
        refundable: true,
        price: "500",
      },
      {
        name: "Mumbai Darshan",
        cityName: "Mumbai",
        duration: "2 hours",
        featured: true,
        opensAt: "06:00",
        closesAt: "10:00",
        physicalDifficulty: "Easy",
        localGuidesAvailable: false,
        isFamilyFriendly: true,
        refundable: false,
        price: "200",
      },
      {
        name: "Explore Lalbagh Botanical Garden",
        cityName: "Bangalore",
        duration: "3 hours",
        featured: true,
        opensAt: "08:00",
        closesAt: "18:00",
        physicalDifficulty: "Moderate",
        localGuidesAvailable: true,
        isFamilyFriendly: true,
        refundable: true,
        price: "300",
      },
      {
        name: "Amer Fort Tour",
        cityName: "Jaipur",
        duration: "4 hours",
        featured: true,
        opensAt: "10:00",
        closesAt: "17:00",
        physicalDifficulty: "Moderate",
        localGuidesAvailable: true,
        isFamilyFriendly: true,
        refundable: false,
        price: "700",
      },
      {
        name: "Elephant Ride at Amer Fort",
        cityName: "Jaipur",
        duration: "1 hours",
        featured: true,
        opensAt: "08:00",
        closesAt: "12:00",
        physicalDifficulty: "Moderate",
        localGuidesAvailable: true,
        isFamilyFriendly: true,
        refundable: true,
        price: "1000",
      },
      {
        name: "Explore Golconda Fort",
        cityName: "Hyderabad",
        duration: "3 hours",
        featured: true,
        opensAt: "10:00",
        closesAt: "16:00",
        physicalDifficulty: "Moderate",
        localGuidesAvailable: true,
        isFamilyFriendly: true,
        refundable: true,
        price: "700",
      },
    ];
  
    for (const activity of activities) {
      const url = `${BASE_URL}/activities`;
      const options = {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        data: {
          name: activity.name,
          cityName: activity.cityName,
          description: `${activity.name} description`,
          duration: activity.duration,
          featured: activity.featured,
          opensAt: activity.opensAt,
          closesAt: activity.closesAt,
          physicalDifficulty: activity.physicalDifficulty,
          localGuidesAvailable: activity.localGuidesAvailable,
          isFamilyFriendly: activity.isFamilyFriendly,
          refundable: activity.refundable,
          price: activity.price,
        },
      };
  
      try {
        const response = await axios(url, options);
        switch (activity.name) {
          case "Visit Charminar":
            activity1Id = response.data.data.activity._id;
            break;
          case "Mumbai Darshan":
            activity2Id = response.data.data.activity._id;
            break;
          case "Amer Fort Tour":
            activity3Id = response.data.data.activity._id;
            break;
          case "Elephant Ride at Amer Fort":
            activity4Id = response.data.data.activity._id;
          case "Explore Lalbagh Botanical Garden":
            activity5Id = response.data.data.activity._id;
            break;
          case "Explore Golconda Fort":
            replacementActivityId = response.data.data.activity._id;
            break;
        }
        logger.info(`Activity created: ${response.data.data.activity.name}`);
        expect(response.status).toBe(201);
      } catch (error) {
        logger.error("Error creating activity:", error.response ? error.response.data : error.message);
        expect(error.response?.status).not.toBe(500);
      }
    }
  }, 5000000);

// -------------------------------------- CREATE COUPONLESS AND GENERAL DISCOUNT FOR DESTINATION ------------------------------------//
  it("should create couponless and general discounts", async () => {
    try {
      // Add couponless discount
      const couponlessDiscountUrl = `${BASE_URL}/discounts`;
      const couponlessDiscountOptions = {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        data: {
          applicableOn: { package: true },
          destination: destinationId,
          discountType: "couponless",
          userType: "all",
          noOfUsesPerUser: 10,
          noOfUsersTotal: 100,
          startDate: new Date().toISOString(),
          endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
          discountPercentage: 10,
          maxDiscount: 1000,
          noLimit: false,
          active: true,
          archived: false,
        },
      };

      const couponlessDiscountResponse = await axios(couponlessDiscountUrl, couponlessDiscountOptions);
      couponlessDiscountId = couponlessDiscountResponse.data.data.data._id;
      logger.info(`Couponless discount added: ${couponlessDiscountId}`);
      expect(couponlessDiscountResponse.status).toBe(201);

      // Add general discount
      const generalDiscountOptions = {
        ...couponlessDiscountOptions,
        data: {
          ...couponlessDiscountOptions.data,
          discountType: "general",
          discountPercentage: 15,
        },
      };

      const generalDiscountResponse = await axios(couponlessDiscountUrl, generalDiscountOptions);
      generalDiscountId = generalDiscountResponse.data.data.data._id;
      logger.info(`General discount added: ${generalDiscountId}`);
      expect(generalDiscountResponse.status).toBe(201);
    } catch (error) {
      logger.error("Error creating discounts:", error.response ? error.response.data : error.message);
      throw error;
    }
  });

// ---------------------------------------------------- CREATE ITINERARY ------------------------------------------------------------//
  it("should create an itinerary with 3 cities and couponless discount applied", async () => {
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() + 2);
    const formattedDate = currentDate.toISOString().split("T")[0];

    const url = `${BASE_URL}/itinerary`;
    const options = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${testUserToken}`,
        "Content-Type": "application/json",
      },
      data: {
        startDate: formattedDate,
        rooms: [{ adults: 2, children: 1, childrenAges: [10] }],
        departureCity: "New Delhi",
        arrivalCity: "New Delhi",
        countryId: destinationId,
        cities: [city1Id, city2Id, city3Id],
        activities: [activity1Id, activity2Id, activity3Id, activity4Id],
        tripDuration: "5-10 days",
        travellingWith: "Family",
      },
    };

    try {
      const response = await axios(url, options);
      console.log(JSON.stringify(response.data))
      itineraryId = response.data.data.sanitizedItinerary._id;
      logger.info(`Itinerary created: ${itineraryId}`);
      expect(response.status).toBe(200);

      const itinerary = response.data.data.sanitizedItinerary;
      expect(itinerary.discounts).toContain(couponlessDiscountId);
      const lead = response.data.data.newLead;
      leadId = lead._id;
      expect(lead).toBeDefined();
      expect(lead.itineraryId).toBe(itinerary._id);
      expect(lead.status).toBe("ML");

    } catch (error) {
      console.log("err", error)
      logger.error("Error creating itinerary:", error.response ? error.response.data : error.message);
      throw error;
    }
  }, 5000000);

// ------------------------------------------------ APPLY GENERAL DISCOUNT TO ITINERARY ---------------------------------------------//
  it("should apply a general discount to the itinerary", async () => {
    const applyGeneralDiscountUrl = `${BASE_URL}/itinerary/${itineraryId}/addCoupon/${generalDiscountId}`;
    const applyGeneralDiscountOptions = {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${testUserToken}`,
        "Content-Type": "application/json",
      },
    };

    try {
      const response = await axios(applyGeneralDiscountUrl, applyGeneralDiscountOptions);
      logger.info(`General discount applied successfully to itinerary: ${response.data.message}`);
      expect(response.status).toBe(200);

      const updatedItinerary = response.data.data.itinerary;
      expect(updatedItinerary.discounts).toContain(generalDiscountId); // Ensure general discount is applied
    } catch (error) {
      logger.error("Error applying general discount:", error.response ? error.response.data : error.message);
      throw error;
    }
  }, 5000000);

// ---------------------------------------------------- RETRIEVE LEAD OF ITINERARY --------------------------------------------------//
  it("should retrieve the lead associated with the created itinerary", async () => {
    const url = `${BASE_URL}/leads/${leadId}`;
    const options = {
      method: "GET",
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    };

    try {
      const response = await axios(url, options);
      expect(response.status).toBe(200);
      const lead = response.data.data.lead;
      expect(lead._id).toBe(leadId);
      expect(lead.status).toBeDefined();
      logger.info(`Successfully retrieved lead by ID: ${leadId}`);
    } catch (error) {
      logger.error("Error retrieving lead by ID:", error.response?.data || error.message);
      throw error;
    }
  }, 50000);

// --------------------------------------------------- UPDATE STATUS OF A LEAD  -----------------------------------------------------//
  it("should update the status of a lead", async () => {
    const url = `${BASE_URL}/leads/${leadId}/status`;
    const options = {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      data: {
        status: "Closed",
      },
    };

    try {
      const response = await axios(url, options);
      expect(response.status).toBe(200);
      const updatedLead = response.data.data.lead;
      expect(updatedLead.status).toBe("Closed");
      logger.info(`Lead status updated successfully to "Closed" for Lead ID: ${leadId}`);
    } catch (error) {
      logger.error("Error updating lead status:", error.response?.data || error.message);
      throw error;
    }
  }, 50000);

// ---------------------------------------------------- RETRIEVE LEAD STATISTICS ---------------------------------------------------//
  it("should retrieve lead statistics", async () => {
    const url = `${BASE_URL}/leads/stats`;
    const options = {
      method: "GET",
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    };

    try {
      const response = await axios(url, options);
      expect(response.status).toBe(200);
      const stats = response.data.data.stats;
      expect(stats).toBeDefined();
      expect(stats.day).toBeDefined();
      expect(stats.week).toBeDefined();
      logger.info("Lead statistics retrieved successfully");
    } catch (error) {
      logger.error("Error retrieving lead statistics:", error.response?.data || error.message);
      throw error;
    }
  }, 50000);

// ---------------------------------------------- RETRIEVE TOP PREFERRED DESTINATIONS  ---------------------------------------------//
  it("should retrieve top destinations", async () => {
    const url = `${BASE_URL}/leads/top-destinations`;
    const options = {
      method: "GET",
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
      params: {
        limit: 5,
        period: "week",
      },
    };

    try {
      const response = await axios(url, options);
      expect(response.status).toBe(200);
      const topDestinations = response.data.data.topDestinations;
      expect(topDestinations).toBeDefined();
      expect(Array.isArray(topDestinations)).toBe(true);
      logger.info("Top destinations retrieved successfully");
    } catch (error) {
      logger.error("Error retrieving top destinations:", error.response?.data || error.message);
      throw error;
    }
  }, 50000);

// ---------------------------------------------- RETRIEVE TOP PREFERRED ACTIVITIES  -----------------------------------------------//
  it("should retrieve top activities", async () => {
    const url = `${BASE_URL}/leads/top-activities`;
    const options = {
      method: "GET",
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
      params: {
        limit: 10,
        period: "month",
      },
    };

    try {
      const response = await axios(url, options);
      expect(response.status).toBe(200);
      const topActivities = response.data.data.topActivities;
      expect(topActivities).toBeDefined();
      expect(Array.isArray(topActivities)).toBe(true);
      logger.info("Top activities retrieved successfully");
    } catch (error) {
      logger.error("Error retrieving top activities:", error.response?.data || error.message);
      throw error;
    }
  }, 50000);

// ---------------------------------------------- RETRIEVE EMPLOYEES WITH UPDATE LEAD ACCESS  --------------------------------------//
  it("should retrieve employees with update access to leads", async () => {
    const url = `${BASE_URL}/leads/employees-with-update-access`;
    const options = {
      method: "GET",
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    };

    try {
      const response = await axios(url, options);
      expect(response.status).toBe(200);
      const employees = response.data.data.employeesWithAccess;
      employeeId = employees[0]?._id;
      expect(employees).toBeDefined();
      expect(Array.isArray(employees)).toBe(true);
      logger.info("Employees with update access retrieved successfully");
    } catch (error) {
      logger.error("Error retrieving employees with update access:", error.response?.data || error.message);
      throw error;
    }
  }, 50000);

// ---------------------------------------------- ASSIGN LEAD TO AN EMPLOYEE  -----------------------------------------------------//
  it("should assign a lead to an employee", async () => {
    const url = `${BASE_URL}/leads/${leadId}/assign`;
    const options = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      data: {
        employeeId,
      },
    };

    try {
      const response = await axios(url, options);
      expect(response.status).toBe(200);
      const updatedLead = response.data.data.lead;
      expect(updatedLead.assignedTo).toBeDefined();
      logger.info(`Lead successfully assigned to employee: ${employeeId}`);
    } catch (error) {
      logger.error("Error assigning lead to employee:", error.response?.data || error.message);
      throw error;
    }
  }, 50000);

// ---------------------------------------------- REPLACE ACTIVITY IN ITINERARY  ---------------------------------------------//
  it("should replace activity1 in the itinerary", async () => {
    try {
      const gptActivityId = await getGptActivityIdForActivity1(itineraryId, activity1Id); // Fetch GptActivity ID for activity1Id
      const replaceActivityUrl = `${BASE_URL}/itinerary/${itineraryId}/activity/${gptActivityId}/replace`;
      const replaceActivityOptions = {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${testUserToken}`,
          "Content-Type": "application/json",
        },
        data: {
          newActivityId: replacementActivityId, // ID of the replacement activity
        },
      };

      const response = await axios(replaceActivityUrl, replaceActivityOptions);
      logger.info(`Activity replaced successfully in itinerary: ${response.data.message}`);
      expect(response.status).toBe(200);
    } catch (error) {
      logger.error("Error replacing activity in itinerary:", error.message);
      expect(error.response?.status).not.toBe(500);
    }
  }, 5000000);

// ---------------------------------------------- SHOULD DELETE ACTIVITY IN ITIENRARY  ---------------------------------------------//
  it("should delete activity1 in the itinerary", async () => {
    try {
      const gptActivityId = await getGptActivityIdForReplacementActivity(itineraryId, replacementActivityId); // Fetch GptActivity ID for activity1Id
      const deleteActivityUrl = `${BASE_URL}/itinerary/${itineraryId}/activity/${gptActivityId}/replaceLeisure`;
      const deleteActivityOptions = {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${testUserToken}`,
          "Content-Type": "application/json",
        },
      };

      const response = await axios(deleteActivityUrl, deleteActivityOptions);
      logger.info(`Activity deleted successfully and replaced with leisure in itinerary.`);
      expect(response.status).toBe(200);
    } catch (error) {
      logger.error("Error deleting activity in itinerary:", error.message);
      expect(error.response?.status).not.toBe(500);
    }
  }, 5000000);

// ---------------------------------------------- ADD CITY AT LAST POSITION IN ITINERARY  ------------------------------------------//
  it("should add a city at the last position", async () => {
    const url = `${BASE_URL}/itinerary/${itineraryId}/cities/add-city`;
    const options = {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${testUserToken}`,
        "Content-Type": "application/json",
      },
      data: {
        newCity: "Chennai",
        position: 3,
      },
    };

    try {
      const response = await axios(url, options);
      logger.info(`City added at last position: Chennai`);
      expect(response.status).toBe(200);
    } catch (error) {
      logger.error("Error adding city at last position:", error.response ? error.response.data : error.message);
      expect(error.response.status).not.toBe(500);
    }
  }, 5000000);

  // ---------------------------------------------- ADD CITY AT 0TH POSITION  ---------------------------------------------//
  it("should add a city at position 0", async () => {
    const url = `${BASE_URL}/itinerary/${itineraryId}/cities/add-city`;
    const options = {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${testUserToken}`,
        "Content-Type": "application/json",
      },
      data: {
        newCity: "Bangalore",
        position: 0,
      },
    };

    try {
      const response = await axios(url, options);
      logger.info(`City added at position 0: Bangalore`);
      expect(response.status).toBe(200);
    } catch (error) {
      logger.error("Error adding city at position 0:", error.response ? error.response.data : error.message);
      expect(error.response.status).not.toBe(500);
    }
  }, 5000000);

  // ---------------------------------------------- ADD CITY AT MIDDLE POSITION  ---------------------------------------------//
  it("should add a city at a middle position", async () => {
    const url = `${BASE_URL}/itinerary/${itineraryId}/cities/add-city`;
    const options = {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${testUserToken}`,
        "Content-Type": "application/json",
      },
      data: {
        newCity: "Kolkata",
        position: 2,
      },
    };

    try {
      const response = await axios(url, options);
      logger.info(`City added at middle position: Kolkata`);
      expect(response.status).toBe(200);
    } catch (error) {
      logger.error("Error adding city at middle position:", error.response ? error.response.data : error.message);
      expect(error.response.status).not.toBe(500);
    }
  }, 5000000);

// ---------------------------------------------- ADD DAYS TO A CITY  ---------------------------------------------//
  it("should add 2 days to a city", async () => {
    const cityIndex = 1; // Index of the city to add days to
    const url = `${BASE_URL}/itinerary/${itineraryId}/cities/${cityIndex}/add-days`;
    const options = {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${testUserToken}`,
        "Content-Type": "application/json",
      },
      data: {
        additionalDays: 2,
      },
    };

    try {
      const response = await axios(url, options);
      logger.info(`2 days added to city at index ${cityIndex}`);
      expect(response.status).toBe(200);
    } catch (error) {
      logger.error("Error adding days to city:", error.response ? error.response.data : error.message);
      expect(error.response.status).not.toBe(500);
    }
  }, 5000000);

// ---------------------------------------------- DELETE DAYS FROM A CITY  ---------------------------------------------//
  it("should delete 1 day from a city", async () => {
    const cityIndex = 1; // Index of the city to delete days from
    const url = `${BASE_URL}/itinerary/${itineraryId}/cities/${cityIndex}/delete-days`;
    const options = {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${testUserToken}`,
        "Content-Type": "application/json",
      },
      data: {
        daysToDelete: 1,
      },
    };

    try {
      const response = await axios(url, options);
      logger.info(`1 day deleted from city at index ${cityIndex}`);
      expect(response.status).toBe(200);
    } catch (error) {
      logger.error("Error deleting days from city:", error.response ? error.response.data : error.message);
      expect(error.response.status).not.toBe(500);
    }
  }, 5000000);

// ---------------------------------------------- DELETE CITY AT LAST POSITION  ---------------------------------------------//
  it("should delete the city at the last position", async () => {
    try {
      const enrichedItinerary = await fetchItineraryDetails(itineraryId);
      const lastCityIndex = enrichedItinerary.itinerary.length - 1;
      const deleteCityUrl = `${BASE_URL}/itinerary/${itineraryId}/cities/${lastCityIndex}/delete-city`;
      const deleteOptions = {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${testUserToken}`,
          "Content-Type": "application/json",
        },
      };

      const response = await axios(deleteCityUrl, deleteOptions);
      logger.info(`City at index ${lastCityIndex} (last position) deleted successfully.`);
      expect(response.status).toBe(200);
    } catch (error) {
      logger.error("Error deleting city at last position:", error.response ? error.response.data : error.message);
      expect(error.response?.status).not.toBe(500);
    }
  }, 5000000);

// ---------------------------------------------- REPLACE CITY IN ITINERARY  ---------------------------------------------//
  it("should replace a city in the itinerary", async () => {
    const cityIndex = 0;
    const url = `${BASE_URL}/itinerary/${itineraryId}/cities/${cityIndex}/replace-city`;
    const options = {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${testUserToken}`,
        "Content-Type": "application/json",
      },
      data: {
        newCity: "Ahemdabad",
      },
    };

    try {
      const response = await axios(url, options);
      logger.info(`City at index ${cityIndex} replaced with Ahemdabad`);
      expect(response.status).toBe(200);
    } catch (error) {
      logger.error("Error replacing city in itinerary:", error.response ? error.response.data : error.message);
      expect(error.response.status).not.toBe(500);
    }
  }, 5000000);

// ---------------------------------------------- DELETE CITY AT 0TH POSITION  ---------------------------------------------//
  it("should delete the city at the 0th position", async () => {
    const cityIndex = 0; // First city index
    const url = `${BASE_URL}/itinerary/${itineraryId}/cities/${cityIndex}/delete-city`;
    const options = {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${testUserToken}`,
        "Content-Type": "application/json",
      },
    };

    try {
      const response = await axios(url, options);
      logger.info(`City at index ${cityIndex} deleted successfully.`);
      expect(response.status).toBe(200);
    } catch (error) {
      logger.error("Error deleting city at 0th position:", error.response ? error.response.data : error.message);
      expect(error.response.status).not.toBe(500);
    }
  }, 5000000);

// ---------------------------------------------- DELETE CITY AT MIDDLE POSITION  ---------------------------------------------//
  it("should delete the city at a middle position", async () => {

    try {
      const cityIndex = 2;

      const deleteCityUrl = `${BASE_URL}/itinerary/${itineraryId}/cities/${cityIndex}/delete-city`;
      const deleteOptions = {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${testUserToken}`,
          "Content-Type": "application/json",
        },
      };

      const response = await axios(deleteCityUrl, deleteOptions);
      logger.info(`City at index ${cityIndex} deleted successfully.`);
      expect(response.status).toBe(200);
    } catch (error) {
      logger.error("Error deleting city at middle position:", error.response ? error.response.data : error.message);
      expect(error.response?.status).not.toBe(500);
    }
  }, 5000000);

// ---------------------------------------------- REPLACE TRANSFER MODE  ---------------------------------------------//
  it("should dynamically replace transport mode in the itinerary", async () => {
    try {
      const enrichedItinerary = await fetchItineraryDetails(itineraryId);
      const itinerary = enrichedItinerary.itinerary;

      let cityIndexToUpdate = null;
      let newTransportMode = null;

      for (let i = 0; i < itinerary.length; i++) {
        if (itinerary[i].transport?.mode === "Car") {
          cityIndexToUpdate = i;
          newTransportMode = "Flight";
          break;
        }
      }

      if (cityIndexToUpdate === null) {
        for (let i = 0; i < itinerary.length; i++) {
          if (itinerary[i].transport?.mode === "Flight") {
            cityIndexToUpdate = i;
            newTransportMode = "Car";
            break;
          }
        }
      }

      if (cityIndexToUpdate === null) {
        for (let i = 0; i < itinerary.length; i++) {
          if (itinerary[i].transport?.mode === "Ferry") {
            cityIndexToUpdate = i;
            newTransportMode = "Flight";
            break;
          }
        }
      }

      if (cityIndexToUpdate === null) {
        throw new Error("No Car, Flight, or Ferry transport modes found in the itinerary.");
      }

      const changeTransportUrl = `${BASE_URL}/itinerary/${itineraryId}/cities/${cityIndexToUpdate}/transport-mode`;
      const changeTransportOptions = {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${testUserToken}`,
          "Content-Type": "application/json",
        },
        data: {
          newMode: newTransportMode,
        },
      };

      const response = await axios(changeTransportUrl, changeTransportOptions);

      logger.info(`Transport mode updated successfully to ${newTransportMode} at city index ${cityIndexToUpdate}`);
      expect(response.status).toBe(200);

      const updatedEnrichedItinerary = await fetchItineraryDetails(itineraryId);
      const updatedItinerary = updatedEnrichedItinerary.itinerary;
      expect(updatedItinerary[cityIndexToUpdate].transport.mode).toBe(newTransportMode);
    } catch (error) {
      logger.error("Error updating transport mode in the itinerary:", error.message);
      expect(error.response?.status).not.toBe(500);
    }
  }, 5000000);

// ---------------------------------------------- UPDATE ITINERARY DETAILS LIKE DATE AND ROOMS  --------------------------------//
  it("should update the itinerary details", async () => {
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() + 5);
    const updatedStartDate = currentDate.toISOString().split("T")[0];

    const url = `${BASE_URL}/itinerary/${itineraryId}/update-details`;
    const options = {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${testUserToken}`,
        "Content-Type": "application/json",
      },
      data: {
        newStartDate: updatedStartDate,
        travellingWith: "Friends",
        rooms: [
          {
            adults: 2,
            children: 1,
            childrenAges: [7],
          },
          {
            adults: 1,
            children: 0,
          },
        ],
      },
    };

    try {
      const response = await axios(url, options);
      logger.info(`Itinerary updated successfully: ${response.data.message}`);

      const updatedItinerary = response?.data?.data?.enrichedItinerary;
      if (!updatedItinerary) {
        throw new Error("Updated itinerary not found in the response.");
      }

      try {
        expect(updatedItinerary.startDate).toBe(updatedStartDate);
      } catch (assertionError) {
        console.error("Assertion Error:", assertionError.message);
        throw assertionError;
      }
    } catch (error) {
      logger.error("Error updating itinerary details:", error.response?.data || error.message);
      expect(error.response?.status).not.toBe(500);
    }
  }, 5000000);

// ---------------------------------------------- DELETE ITINERARY  ---------------------------------------------//
  it("should delete the itinerary by ID", async () => {
    const deleteItineraryUrl = `${BASE_URL}/itinerary/${itineraryId}`;
    const deleteOptions = {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${testUserToken}`,
        "Content-Type": "application/json",
      },
    };

    try {
      const response = await axios(deleteItineraryUrl, deleteOptions);
      logger.info("Itinerary deleted successfully.");
      expect(response.status).toBe(200);
    } catch (error) {
      logger.error("Error deleting itinerary:", error.response?.data || error.message);
      throw error;
    }
  }, 50000);

// ---------------------------------------------- DELETE COUPONLESS DISCOUNT  ---------------------------------------------//
  it("should delete the couponless discount by ID", async () => {
    const deleteDiscountUrl = `${BASE_URL}/discounts/${couponlessDiscountId}`;
    const deleteOptions = {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
    };

    try {
      const response = await axios(deleteDiscountUrl, deleteOptions);
      logger.info(`Couponless discount with ID ${couponlessDiscountId} deleted successfully.`);
      expect(response.status).toBe(200);
      expect(response.data.message).toBe("Discount deleted successfully");
    } catch (error) {
      logger.error("Error deleting couponless discount:", error.response?.data || error.message);
      expect(error.response?.status).not.toBe(500);
      throw error;
    }
  }, 50000);

// ---------------------------------------------- DELETE GENERAL DISCOUNT  ---------------------------------------------//
  it("should delete the general discount by ID", async () => {
    const deleteDiscountUrl = `${BASE_URL}/discounts/${generalDiscountId}`;
    const deleteOptions = {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
    };

    try {
      const response = await axios(deleteDiscountUrl, deleteOptions);
      logger.info(`General discount with ID ${generalDiscountId} deleted successfully.`);
      expect(response.status).toBe(200);
      expect(response.data.message).toBe("Discount deleted successfully");
    } catch (error) {
      logger.error("Error deleting general discount:", error.response?.data || error.message);
      expect(error.response?.status).not.toBe(500);
      throw error;
    }
  }, 50000);

// ---------------------------------------------- DELETE DESTINATION WITH CITIES AND ACTIVITIES  ---------------------------------------------//
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
  }, 50000);

});
