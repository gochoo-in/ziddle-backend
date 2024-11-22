import axios from "axios";
import dotenv from "dotenv";
import logger from "../config/logger.js";

dotenv.config();

let adminToken = process.env.SUPER_ADMIN_TOKEN;
let testUserToken = process.env.TEST_USER_TOKEN;
let destinationId, itineraryId;
let generalDiscountId, couponlessDiscountId;
let cityIds = [];
let activityIds = [];
let adminPackageId;
const BASE_URL = process.env.BASE_URL;

describe("Admin Package Tests - Destination, Cities, and Activities", () => {
    beforeAll(async () => {
        logger.info("Starting Admin Package Tests.");
    });

    afterAll(async () => {
        logger.info("Tests completed. Cleaning up...");
    });

    it("should create China as a destination", async () => {
        const url = `${BASE_URL}/destination`;
        const options = {
            method: "POST",
            headers: {
                Authorization: `Bearer ${adminToken}`,
                "Content-Type": "application/json",
            },
            data: {
                name: "China",
                currency: "CNY",
                timezone: "UTC+08:00",
                tripDuration: ["7-14 days"],
                description: "Experience the ancient culture and modern wonders of China.",
                visaType: "tourist",
                country: "China",
                continent: "Asia",
                latitude: 35.8617,
                longitude: 104.1954,
                markup: 12,
            },
        };

        try {
            const response = await axios(url, options);
            destinationId = response.data.data.data._id;
            logger.info(`Destination created successfully: ${destinationId}`);
            expect(response.status).toBe(201);
        } catch (error) {
            logger.error("Error creating destination:", error.response?.data || error.message);
            throw error;
        }
    }, 500000);

    it("should create 3 cities for China", async () => {
        const cities = [
            { name: "Beijing", iataCode: "PEK",hotelApiCityName:"Beijing",  nearbyInternationalAirportCity: {
                name: "Beijing",
                iataCode: "PEK"
              } },
            { name: "Shanghai", iataCode: "PVG" ,hotelApiCityName:"Shanghai", nearbyInternationalAirportCity: {
                name: "Shanghai",
                iataCode: "PVG"
              }},
            { name: "Xi'an", iataCode: "XIY",hotelApiCityName:"Xiaguan", nearbyInternationalAirportCity: {
                name: "Xi'an",
                iataCode: "XIY"
              } },
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
                    destinationId,
                    latitude:
                        city.name === "Beijing" ? 39.9042 :
                            city.name === "Shanghai" ? 31.2304 : 34.3416,
                    longitude:
                        city.name === "Beijing" ? 116.4074 :
                            city.name === "Shanghai" ? 121.4737 : 108.9398,
                    country: "China",
                    languageSpoken: "Mandarin",
                    hotelApiCityName:city.hotelApiCityName,
                    nearbyInternationalAirportCity: {
                        name: city.nearbyInternationalAirportCity.name,
                        iataCode: city.nearbyInternationalAirportCity.iataCode
                    }
                },
            };

            try {
                const response = await axios(url, options);
                cityIds.push(response.data.data.city._id);
                logger.info(`City created successfully: ${response.data.data.city.name}`);
                expect(response.status).toBe(201);
            } catch (error) {
                logger.error("Error creating city:", error.response?.data || error.message);
                throw error;
            }
        }
    }, 500000);

    it("should create activities for the cities in China", async () => {
        const activities = [
            {
                name: "Great Wall Hike",
                cityName: "Beijing",
                description: "A guided hike on the Great Wall, an iconic symbol of China.",
                duration: "4 hours",
                featured: true,
                opensAt: "08:00",
                closesAt: "17:00",
                physicalDifficulty: "Moderate",
                localGuidesAvailable: true,
                isFamilyFriendly: true,
                refundable: true,
                price: "800",
            },
            {
                name: "Bund Waterfront Walk",
                cityName: "Shanghai",
                description: "A scenic walk along the historic Bund in Shanghai.",
                duration: "1 hour",
                featured: true,
                opensAt: "06:00",
                closesAt: "22:00",
                physicalDifficulty: "Easy",
                localGuidesAvailable: false,
                isFamilyFriendly: true,
                refundable: false,
                price: "100",
            },
            {
                name: "Terracotta Warriors Tour",
                cityName: "Xi'an",
                description: "Explore the world-famous Terracotta Army and learn about China's ancient history.",
                duration: "3 hours",
                featured: true,
                opensAt: "09:00",
                closesAt: "17:00",
                physicalDifficulty: "Easy",
                localGuidesAvailable: true,
                isFamilyFriendly: true,
                refundable: true,
                price: "500",
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
                data: activity,
            };

            try {
                const response = await axios(url, options);
                activityIds.push(response.data.data.activity._id);
                logger.info(`Activity created successfully: ${response.data.data.activity.name}`);
                expect(response.status).toBe(201);
            } catch (error) {
                logger.error("Error creating activity:", error.response?.data || error.message);
                throw error;
            }
        }
    }, 500000);


    it("should create couponless and general discounts", async () => {
        try {
            const couponlessDiscountUrl = `${BASE_URL}/discounts`;
            const couponlessDiscountOptions = {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${adminToken}`,
                    "Content-Type": "application/json",
                },
                data: {
                    applicableOn: { predefinedPackages: true },
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
    }, 500000);

    it("should create a basic admin package", async () => {
        const url = `${BASE_URL}/admin/package/basic`;
        const options = {
            method: "POST",
            headers: {
                Authorization: `Bearer ${adminToken}`,
                "Content-Type": "application/json",
            },
            data: {
                packageName: "Discover China",
                description: "An immersive journey through China's ancient and modern wonders.",
                destinationId,
                totalDays: 10,
                startDate: "2024-12-01",
                itineraryStartDate: "2024-12-02",
                endDate: "2024-12-10",
                price: "80000",
                createdBy: {
                    name: "Test User"
                },
                category: "OutdoorAdventures",
            },
        };

        try {
            const response = await axios(url, options);
            adminPackageId = response.data.data.adminPackageId;
            logger.info(`Basic Admin Package created successfully: ${adminPackageId}`);
            expect(response.status).toBe(201);
        } catch (error) {
            logger.error("Error creating admin package:", error.response?.data || error.message);
            throw error;
        }
    }, 500000);


    it("should create a basic admin package", async () => {
        const url = `${BASE_URL}/admin/package/basic`;
        const options = {
            method: "POST",
            headers: {
                Authorization: `Bearer ${adminToken}`,
                "Content-Type": "application/json",
            },
            data: {
                packageName: "Discover China",
                description: "An immersive travel experience through China.",
                destinationId,
                totalDays: 10,
                startDate: "2024-12-01",
                itineraryStartDate: "2024-12-02",
                endDate: "2024-12-10",
                price: "80000",
                createdBy: {
                    name: "Test User"
                },
                category: "OutdoorAdventures",
            },
        };
    
        try {
            const response = await axios(url, options);
            adminPackageId = response.data.data.adminPackageId;
            logger.info(`Basic Admin Package created successfully: ${adminPackageId}`);
            expect(response.status).toBe(201);
        } catch (error) {
            logger.error("Error creating admin package:", error.response?.data || error.message);
            throw error;
        }
    }, 500000);
    
    it("should add details to the admin package", async () => {
        const url = `${BASE_URL}/admin/package/details`;
        const options = {
            method: "POST",
            headers: {
                Authorization: `Bearer ${adminToken}`,
                "Content-Type": "application/json",
            },
            data: {
                adminPackageId,
                cities: [
                    {
                        cityId: cityIds[0], // Beijing
                        days: [
                            {
                                activities: [
                                    { activityId: activityIds[0], startTime: "09:00 AM", endTime: "01:00 PM" },
                                ],
                            },
                        ],
                        transportToNextCity: { mode: "Car" },
                        hotel: {
                            name: "Beijing Marriott Hotel City Wall",
                            address: "Dongcheng District, Beijing",
                            rating: 5,
                            price: "4000",
                            currency: "CNY",
                            roomType: "Deluxe",
                            checkin: "3:00 PM",
                            checkout: "12:00 PM",
                            refundable: true,
                        },
                    },
                    {
                        cityId: cityIds[1], // Shanghai
                        days: [
                            {
                                activities: [
                                    { activityId: activityIds[1], startTime: "10:00 AM", endTime: "12:00 PM" },
                                ],
                            },
                        ],
                        transportToNextCity: { mode: "Flight" },
                        hotel: {
                            name: "Hyatt on the Bund",
                            address: "199 Huangpu Road, Shanghai",
                            rating: 5,
                            price: "4500",
                            currency: "CNY",
                            roomType: "Executive Suite",
                            checkin: "3:00 PM",
                            checkout: "12:00 PM",
                            refundable: false,
                        },
                    },
                    {
                        cityId: cityIds[2], // Xi'an
                        days: [
                            {
                                activities: [
                                    { activityId: activityIds[2], startTime: "08:00 AM", endTime: "11:00 AM" },
                                ],
                            },
                        ],
                        transportToNextCity: { mode: "Car" },
                        hotel: {
                            name: "Sofitel Legend People's Grand Hotel Xi'an",
                            address: "319 Dongxin Street, Xi'an",
                            rating: 5,
                            price: "3500",
                            currency: "CNY",
                            roomType: "Luxury Suite",
                            checkin: "2:00 PM",
                            checkout: "12:00 PM",
                            refundable: true,
                        },
                    },
                ],
            },
        };
    
        try {
            const response = await axios(url, options);
            logger.info(`Admin Package details added successfully: ${response.data.message}`);
            expect(response.status).toBe(200);
        } catch (error) {
            logger.error("Error adding details to admin package:", error.response?.data || error.message);
            throw error;
        }
    }, 500000);
    
    it("should create a user itinerary for the admin package", async () => {
        const currentDate = new Date();
        currentDate.setDate(currentDate.getDate() + 2); // Set itinerary start date to 2 days from today
        const itineraryStartDate = currentDate.toISOString().split("T")[0]; // Format date to YYYY-MM-DD
    
        const url = `${BASE_URL}/admin/package/${adminPackageId}/itinerary`;
        const options = {
            method: "POST",
            headers: {
                Authorization: `Bearer ${testUserToken}`,
                "Content-Type": "application/json",
            },
            data: {
                itineraryStartDate,
                travellingWith: "Family",
                rooms: [
                    { adults: 2, children: 1, childrenAges: [8] },
                ],
                departureCity: "Hong Kong",
                arrivalCity: "Beijing",
            },
        };
    
        try {
            const response = await axios(url, options);
            itineraryId = response.data.data.itinerary._id;
            logger.info(`User itinerary created successfully: ${itineraryId}`);
            expect(response.status).toBe(200);
    
            // Verify itinerary data
            const itinerary = response.data.data.itinerary;
            expect(itinerary.enrichedItinerary.title).toBe("Discover China");
            expect(itinerary.rooms[0].adults).toBe(2);
            expect(itinerary.rooms[0].children).toBe(1);
            expect(itinerary.rooms.length).toBe(1);
        } catch (error) {
            logger.error("Error creating user itinerary:", error.response?.data || error.message);
            throw error;
        }
    }, 500000);
    
    it("should apply a general discount to the itinerary", async () => {
        const url = `${BASE_URL}/admin/package/${adminPackageId}/itinerary/${itineraryId}/addCoupon/${generalDiscountId}`;
        const options = {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${testUserToken}`,
                "Content-Type": "application/json",
            },
        };
    
        try {
            const response = await axios(url, options);
            logger.info("General discount applied successfully to itinerary.");
            expect(response.status).toBe(200);
    
            const updatedItinerary = response.data.data.itinerary;
            expect(updatedItinerary.generalDiscount).toBeDefined();
        } catch (error) {
            console.log("error kyu aa rhi hai",error)
            logger.error("Error applying general discount:", error.response?.data || error.message);
            throw error;
        }
    }, 10000);
    
    it("should retrieve admin packages by max budget", async () => {
        const maxBudget = 100000;
        const url = `${BASE_URL}/admin/packages/budget?maxBudget=${maxBudget}`;
        const options = {
            method: "GET",
            headers: {
                Authorization: `Bearer ${testUserToken}`,
            },
        };
    
        try {
            const response = await axios(url, options);
            logger.info("Admin packages retrieved successfully by max budget.");
            expect(response.status).toBe(200);
    
            const packages = response.data.data.data;
            packages.forEach(pkg => {
                expect(parseInt(pkg.price)).toBeLessThanOrEqual(maxBudget);
            });
    
            expect(response.data.data.startingPrice).toBeDefined();
        } catch (error) {
            logger.error("Error retrieving admin packages by max budget:", error.response?.data || error.message);
            throw error;
        }
    }, 10000);
    
    it("should retrieve admin packages by destination ID", async () => {
        const url = `${BASE_URL}/admin/packages/destination/${destinationId}`;
        const options = {
            method: "GET",
            headers: {
                Authorization: `Bearer ${testUserToken}`,
            },
        };
    
        try {
            const response = await axios(url, options);
            logger.info("Admin packages retrieved successfully by destination ID.");
            expect(response.status).toBe(200);
    
            const packages = response.data.data.data;
            packages.forEach(pkg => {
                expect(pkg.destination).toBe(destinationId);
            });
    
            expect(response.data.data.idealDuration).toBeDefined();
        } catch (error) {
            logger.error("Error retrieving admin packages by destination ID:", error.response?.data || error.message);
            throw error;
        }
    }, 10000);
  
    
    it("should delete an admin package by ID", async () => {
        const deletePackageUrl = `${BASE_URL}/admin/packages/${adminPackageId}`;
        const deleteOptions = {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${adminToken}`,
                "Content-Type": "application/json",
            },
        };
    
        try {
            const deleteResponse = await axios(deletePackageUrl, deleteOptions);
            logger.info(`Admin package deleted successfully: ${adminPackageId}`);
            expect(deleteResponse.status).toBe(200);
    
            const deletedData = deleteResponse.data.data;
            expect(deletedData.deletedPackageId).toBe(adminPackageId);
            expect(deleteResponse.data.success).toBe(true);
            expect(deleteResponse.data.message).toBe("Admin package deleted successfully");
        } catch (error) {
            logger.error("Error deleting admin package:", error.response?.data || error.message);
            throw error;
        }
    }, 10000);
    
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
    }, 10000);
    
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
    }, 10000);
    
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
    }, 10000);
    
    it("should delete the destination and associated cities and activities", async () => {
        const url = `${BASE_URL}/destination/${destinationId}`;
        const options = {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${adminToken}`,
            },
        };
    
        try {
            const response = await axios(url, options);
            logger.info(`Destination deleted successfully: ${destinationId}`);
            expect(response.status).toBe(200);
        } catch (error) {
            logger.error("Error deleting destination:", error.response ? error.response.data : error.message);
            expect(error.response.status).not.toBe(500);
        }
    }, 10000);
    
});
