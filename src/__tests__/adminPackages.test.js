import axios from "axios";
import dotenv from "dotenv";
import logger from "../config/logger.js";

dotenv.config();

let adminToken = process.env.SUPER_ADMIN_TOKEN;
let testUserToken;
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


    it("should sign in the test user", async () => {
        try {
            // Step 1: Trigger OTP request for the test user
            const signinUrl = `${BASE_URL}/auth/signin`;
            const signinOptions = {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                data: { phoneNumber: "1111122222" }, // Trigger OTP generation
            };

            await axios(signinUrl, signinOptions);

            // Step 2: Sign in with OTP 1111
            const otpSigninOptions = {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                data: { phoneNumber: "1111122222", otp: "1111" },
            };

            const response = await axios(signinUrl, otpSigninOptions);
            testUserToken = response.data.token; // Store the token

            logger.info("Test user signed in successfully.");
            expect(response.status).toBe(200);
        } catch (error) {
            logger.error("Error during user sign-in:", error.response?.data || error.message);
            throw error;
        }
    });

    it("should create Pakistan as a destination", async () => {
        const url = `${BASE_URL}/destination`;
        const options = {
            method: "POST",
            headers: {
                Authorization: `Bearer ${adminToken}`,
                "Content-Type": "application/json",
            },
            data: {
                name: "Pakistan",
                currency: "PKR",
                timezone: "UTC+05:00",
                tripDuration: ["5-15 days"],
                description: "Discover the rich culture and breathtaking landscapes of Pakistan.",
                visaType: "tourist",
                country: "Pakistan",
                continent: "Asia",
                latitude: 30.3753,
                longitude: 69.3451,
                markup: 10,
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


    it("should create 3 cities for Pakistan", async () => {
        const cities = [
            { name: "Islamabad", iataCode: "ISB", hotelApiCityName: "Islamabad" },
            { name: "Karachi", iataCode: "KHI", hotelApiCityName: "Karachi" },
            { name: "Lahore", iataCode: "LHE", hotelApiCityName: "Lahore"},
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
                    hotelApiCityName: city.hotelApiCityName,
                    latitude:
                        city.name === "Islamabad" ? 33.6844 :
                            city.name === "Karachi" ? 24.8607 : 31.5497,
                    longitude:
                        city.name === "Islamabad" ? 73.0479 :
                            city.name === "Karachi" ? 67.0011 : 74.3436,
                    country: "Pakistan",
                    languageSpoken: "Urdu, English",
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

    it("should create activities for the cities in Pakistan", async () => {
        const activities = [
            {
                name: "Faisal Mosque Visit",
                cityName: "Islamabad",
                description: "A visit to the iconic Faisal Mosque, one of the largest mosques in the world.",
                duration: "2 hours",
                featured: true,
                opensAt: "09:00",
                closesAt: "18:00",
                physicalDifficulty: "Easy",
                localGuidesAvailable: true,
                isFamilyFriendly: true,
                refundable: true,
                price: "500",
            },
            {
                name: "Clifton Beach Walk",
                cityName: "Karachi",
                description: "Enjoy a serene walk along the famous Clifton Beach in Karachi.",
                duration: "1.5 hours",
                featured: true,
                opensAt: "06:00",
                closesAt: "20:00",
                physicalDifficulty: "Easy",
                localGuidesAvailable: false,
                isFamilyFriendly: true,
                refundable: false,
                price: "300",
            },
            {
                name: "Badshahi Mosque Tour",
                cityName: "Lahore",
                description: "Explore the historic Badshahi Mosque, a masterpiece of Mughal architecture.",
                duration: "3 hours",
                featured: true,
                opensAt: "10:00",
                closesAt: "17:00",
                physicalDifficulty: "Moderate",
                localGuidesAvailable: true,
                isFamilyFriendly: true,
                refundable: true,
                price: "400",
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
                packageName: "Discover Pakistan",
                description: "An immersive travel experience through Pakistan.",
                destinationId,
                totalDays: 7,
                startDate: "2024-12-01",
                itineraryStartDate: "2024-12-02",
                endDate: "2024-12-08",
                price: "60000",
                createdBy: {
                    "name": "Test User"
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
                        cityId: cityIds[0],
                        days: [
                            {
                                activities: [
                                    { activityId: activityIds[0], startTime: "10:00 AM", endTime: "12:00 PM" },
                                ],
                            },
                        ],
                        transportToNextCity: { mode: "Car" },
                        hotel: {
                            name: "Islamabad Serena Hotel",
                            address: "Khayaban-e-Suharwardy, G-5",
                            rating: 5,
                            price: "3000",
                            currency: "PKR",
                            roomType: "Deluxe",
                            checkin: "2:00 PM",
                            checkout: "12:00 PM",
                            refundable: true,
                        },
                    },
                    {
                        cityId: cityIds[1],
                        days: [
                            {
                                activities: [
                                    { activityId: activityIds[1], startTime: "9:00 AM", endTime: "11:30 AM" },
                                ],
                            },
                        ],
                        transportToNextCity: { mode: "Flight" },
                        hotel: {
                            name: "Pearl Continental Karachi",
                            address: "Club Road, Karachi",
                            rating: 4,
                            price: "4000",
                            currency: "PKR",
                            roomType: "Executive Suite",
                            checkin: "3:00 PM",
                            checkout: "12:00 PM",
                            refundable: false,
                        },
                    },
                    {
                        cityId: cityIds[2],
                        days: [
                            {
                                activities: [
                                    { activityId: activityIds[2], startTime: "2:00 PM", endTime: "5:00 PM" },
                                ],
                            },
                        ],
                        transportToNextCity: { mode: "Car" },
                        hotel: {
                            name: "Avari Hotel Lahore",
                            address: "87 Shahrah-e-Quaid-e-Azam, Lahore",
                            rating: 5,
                            price: "2010",
                            currency: "PKR",
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
                    { adults: 2, children: 1, childrenAges: [10] },
                ],
                departureCity: "Peshawar",
                arrivalCity: "Islamabad",
            },
        };

        try {
            const response = await axios(url, options);
            itineraryId = response.data.data.itinerary._id;
            logger.info(`User itinerary created successfully: ${itineraryId}`);
            expect(response.status).toBe(200);

            // Verify itinerary data
            const itinerary = response.data.data.itinerary;
            expect(itinerary.enrichedItinerary.title).toBe("Discover Pakistan");
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


    it("should retrieve admin packages by category", async () => {
        const category = "OutdoorAdventures";
        const url = `${BASE_URL}/admin/packages/category/${category}`;
        const options = {
            method: "GET",
            headers: {
                Authorization: `Bearer ${adminToken}`,
            },
        };

        try {
            const response = await axios(url, options);
            logger.info("Admin packages retrieved successfully by category.");
            expect(response.status).toBe(200);

            const packages = response.data.data.data;
            packages.forEach(pkg => {
                expect(pkg.category).toContain(category);
            });

            expect(response.data.data.startingPrice).toBeDefined();
            expect(response.data.data.startingPrice).toBe(60000);

            logger.info("All packages retrieved and validated successfully.");
        } catch (error) {
            logger.error("Error retrieving admin packages by category:", error.response?.data || error.message);
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

    it("should log out the test user", async () => {
        try {
            const logoutUrl = `${BASE_URL}/auth/logout`;
            const logoutOptions = {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${testUserToken}`,
                    "Content-Type": "application/json",
                },
            };

            const response = await axios(logoutUrl, logoutOptions);
            logger.info("Test user logged out successfully.");
            expect(response.status).toBe(200);
        } catch (error) {
            logger.error("Error during user logout:", error.response?.data || error.message);
            throw error;
        }
    });


});
