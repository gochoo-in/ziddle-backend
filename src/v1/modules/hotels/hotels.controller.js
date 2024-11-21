import City from '../../models/city.js';
import logger from '../../../config/logger.js';
import dotenv from 'dotenv';
import StatusCodes from 'http-status-codes';
import httpFormatter from '../../../utils/formatter.js';
import axios from 'axios';


const HOTEL_DETAILS_API_URL = process.env.HOTEL_DETAILS_API_URL;
const CONVERSION_API_URL = process.env.CONVERSION_API_URL;
const BASE_CURRENCY = 'INR';
const PREDEFINED_USERNAME = process.env.TBO_HOTEL_PREDEFINED_USERNAME
const PREDEFINED_PASSWORD = process.env.TBO_HOTEL_PREDEFINED_PASSWORD
const TBO_HOTEL_USERNAME = process.env.TBO_HOTEL_USERNAME
const TBO_HOTEL_PASSWORD = process.env.TBO_HOTEL_PASSWORD
const HOTEL_CODES_API_URL = process.env.HOTEL_CODES_API_URL
const HOTEL_COUNTRY_API_URL = process.env.HOTEL_COUNTRY_API_URL
const HOTEL_CITY_API_URL = process.env.HOTEL_CITY_API_URL
const HOTEL_SEARCH_API_URL = process.env.HOTEL_SEARCH_API_URL


async function getHotelCodes(cityCode) {
    
    try {
        const response = await axios.post(
            HOTEL_CODES_API_URL,
            {
                CityCode: cityCode,
                IsDetailedResponse: "false"
            },
            {
                auth: {
                    username: PREDEFINED_USERNAME,
                    password: PREDEFINED_PASSWORD
                }
            }
        );

        const hotelCodesList = response.data.Hotels;
        if (!hotelCodesList) {
            throw new Error("Failed to fetch hotel codes list.");
        }

        const hotelCodes = hotelCodesList.map(hotel => hotel.HotelCode);
       
        return hotelCodes;
    } catch (error) {
        console.error("Error fetching hotel codes:", error.message);
        return null;
    }
}

// Function to fetch the country code based on the country name
async function getCountryCode(countryName) {
   
    try {
        const response = await axios.get(HOTEL_COUNTRY_API_URL, {
            auth: {
                username: PREDEFINED_USERNAME,
                password: PREDEFINED_PASSWORD
            }
        });

        const countryList = response.data.CountryList;
        if (!countryList) {
            throw new Error("Failed to fetch country list.");
        }

        const countryData = countryList.find(item => item.Name === countryName);
        if (!countryData) {
            console.warn(`Country code for ${countryName} not found in the API response.`);
            return null;
        }

        
        return countryData.Code;
    } catch (error) {
        console.error("Error fetching country code:", error.message);
        return null;
    }
}

// Function to fetch the city code based on the country code and city name
async function getCityCode(countryCode, cityName) {
   
    try {
        const response = await axios.post(
            HOTEL_CITY_API_URL,
            { CountryCode: countryCode },
            {
                auth: {
                    username: PREDEFINED_USERNAME,
                    password: PREDEFINED_PASSWORD
                }
            }
        );

        const cityList = response.data.CityList;
        if (!cityList) {
            throw new Error("Failed to fetch city list.");
        }

        const cityData = cityList.find(item => item.Name === cityName);
        if (!cityData) {
            console.warn(`City code for ${cityName} not found in the API response.`);
            return null;
        }

       
        return cityData.Code;
    } catch (error) {
        console.error("Error fetching city code:", error.message);
        return null;
    }
}

export const getCityName = async (req, res) => {
    const {countryCode} = req.body
   
    try {
        const response = await axios.post(
            HOTEL_CITY_API_URL,
            { CountryCode: countryCode },
            {
                auth: {
                    username: PREDEFINED_USERNAME,
                    password: PREDEFINED_PASSWORD
                }
            }
        );
        const data = response.data.CityList
        return res.status(StatusCodes.CREATED).json(httpFormatter({ data }, 'Cities for destination ', true));
        
    } catch (error) {
        logger.error('Error retrieving cities:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Error retrieving cities', false));
    }
}


// Function to fetch hotel details by hotel codes
async function getHotelDetailsByCodes(checkIn, checkOut, hotelCodes, guestNationality, adults, childrenAges) {
  
    try {
        const response = await axios.post(
            HOTEL_SEARCH_API_URL,
            {
                CheckIn: checkIn,
                CheckOut: checkOut,
                HotelCodes: hotelCodes.join(','),  // Join codes as comma-separated values
                GuestNationality: guestNationality,
                PaxRooms: [
                    {
                        Adults: adults,
                        Children: childrenAges ? childrenAges.length : 0,
                        ChildrenAges: childrenAges && childrenAges.length > 0 ? childrenAges : null
                    }
                ]
            },
            {
                auth: {
                    username: TBO_HOTEL_USERNAME,
                    password: TBO_HOTEL_PASSWORD
                }
            }
        );

   

        if (response.data && response.data.HotelResult) {
            
            return response.data.HotelResult;  // Return the hotel search results
        } else {
            console.warn('No hotel details found in the response data.');
            return null;
        }
    } catch (error) {
        console.error("Error fetching hotel details by codes:", error.message);
        return null;
    }
}

// Function to fetch hotel details by HotelCode
async function getHotelDetails(hotelCode) {
    try {
        const response = await axios.post(
            HOTEL_DETAILS_API_URL,
            {
                Hotelcodes: hotelCode,
                Language: "EN"
            },
            {
                auth: {
                    username: PREDEFINED_USERNAME,
                    password: PREDEFINED_PASSWORD
                }
            }
        );

        if (response.data) {
            return response.data;
        } else {
            console.warn(`No details found for HotelCode ${hotelCode}.`);
            return null;
        }
    } catch (error) {
        console.error("Error fetching hotel details:", error.message);
        return null;
    }
}
async function fetchHotelDetails(latitude, longitude, arrivalDate, departureDate, adults, childrenAges = [], roomQty = 1, cityId, cityCode) {
    try {
        const childrenAgesString = Array.isArray(childrenAges) && childrenAges.length > 0 ? childrenAges.join(',') : '0';

        // Fetch hotel codes for the specified city code
        const hotelCodes = await getHotelCodes(cityCode);
        if (!hotelCodes) {
            throw new Error('No hotel codes found for the specified city.');
        }

        // Fetch hotel details using the hotel codes
        const hotelDetails = await getHotelDetailsByCodes(
            arrivalDate,
            departureDate,
            hotelCodes,
            "IN",  // Assuming guest nationality is India (IN)
            adults,
            childrenAges
        );

        if (!hotelDetails || hotelDetails.length === 0) {
            console.warn('No hotel details found for the provided hotel codes.');
            return null;
        }

        // Sort hotels by TotalFare to get a list ordered by price (ascending)
        const sortedHotels = hotelDetails.sort((a, b) => a.Rooms[0].TotalFare - b.Rooms[0].TotalFare);

        // Select the top 2 cheapest hotels
        const top2Cheapest = sortedHotels.slice(0, 2);

        // Select the top 2 most expensive hotels
        const top2Expensive = sortedHotels.slice(-2);

        // Select a middle-priced hotel
        const middleHotel = sortedHotels[Math.floor(sortedHotels.length / 2)];

        // Combine the results into a final array
        const selectedHotels = [...top2Cheapest, middleHotel, ...top2Expensive];


      

        // Fetch detailed information for each selected hotel
        const detailedHotels = await Promise.all(selectedHotels.map(async (hotel) => {
            const detailedHotelInfo = await getHotelDetails(hotel.HotelCode);
            const room = hotel.Rooms[0];
            return {
                name: detailedHotelInfo?.HotelDetails[0]?.HotelName || 'Unknown Name',
                address: detailedHotelInfo?.HotelDetails[0]?.Address || 'Unknown Address',
                rating: detailedHotelInfo?.HotelDetails[0]?.HotelRating || 5,
                price: room.TotalFare,
                currency: hotel.Currency,
                image: detailedHotelInfo?.HotelDetails[0]?.Images[0] || 'https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg',
                cancellation: room.CancelPolicies ? 'Cancellation available' : 'No free cancellation',
                checkin: `${arrivalDate} ${detailedHotelInfo?.HotelDetails[0]?.CheckInTime ?? '12:00 AM'}`,
                checkout: `${departureDate} ${detailedHotelInfo?.HotelDetails[0]?.CheckOutTime ?? '12:00 PM'}`,
                roomType: room.Name[0],
                refundable: room.IsRefundable,
                cityId: cityId,
                hotelcode:detailedHotelInfo?.HotelDetails[0]?.HotelCode
            };
        }));

        return detailedHotels;
    } catch (error) {
        console.error('Error fetching hotel details:', { message: error.message });
        return null;
    }
}



export const getTopHotels = async (req, res) => {
    const { cityId } = req.params;
    const { arrivalDate, departureDate, adults = 1 } = req.query;

    try {
        logger.info(`Fetching hotels for cityId: ${cityId}, arrivalDate: ${arrivalDate}, departureDate: ${departureDate}, adults: ${adults}`);

        if (!arrivalDate || !departureDate) {
            logger.warn('Missing arrival or departure date');
            return res
                .status(StatusCodes.BAD_REQUEST)
                .json(httpFormatter({}, 'Arrival date and departure date are required.', false));
        }

        const city = await City.findById(cityId);
        if (!city) {
            logger.warn(`City with ID ${cityId} not found`);
            return res
                .status(StatusCodes.NOT_FOUND)
                .json(httpFormatter({}, 'City not found.', false));
        }



        const { country } = city; // assuming city has countryName field

        if (!country) {
            logger.warn(`Country for city ${country} not found in the database.`);
            itinerary[i].hotelDetails = null;
            
        }

        const countryCode = await getCountryCode(country);
        if (!countryCode) {
            itinerary[i].hotelDetails = null;
            
        }

        const cityCode = await getCityCode(countryCode, city.name);

        const { latitude, longitude } = city;
        logger.info(`Found city: ${city.name}, latitude: ${latitude}, longitude: ${longitude}`);

        const hotels = await fetchHotelDetails(latitude, longitude, arrivalDate, departureDate, adults,[], 1,city._id,cityCode);

        const hotelsArray = Array.isArray(hotels) ? hotels : [hotels];

        if (!hotelsArray || hotelsArray.length === 0) {
            logger.warn(`No hotels found for cityId: ${cityId} and the specified dates.`);
            return res
                .status(StatusCodes.NOT_FOUND)
                .json(httpFormatter({}, 'No hotels found for the specified city and dates.', false));
        }

        const top5Hotels = hotelsArray.slice(0, 5);

        logger.info(`Successfully fetched 5 hotels for cityId: ${cityId}`);

        return res
            .status(StatusCodes.OK)
            .json(httpFormatter({ top5Hotels }, 'Hotels fetched successfully.'));
    } catch (error) {
        logger.error('Error fetching hotels:', { message: error.message });
        return res
            .status(StatusCodes.INTERNAL_SERVER_ERROR)
            .json(httpFormatter({}, 'Internal server error.', false));
    }
};
 





export const getSpecificHotelDetails = async (req, res) => {
    const { cityId, hotelCode } = req.params;

    try {
        logger.info(`Fetching hotel details for cityId: ${cityId}, hotelCode: ${hotelCode}`);

        // Validate city existence in the database
        const city = await City.findById(cityId);
        if (!city) {
            logger.warn(`City with ID ${cityId} not found`);
            return res
                .status(StatusCodes.NOT_FOUND)
                .json(httpFormatter({}, 'City not found.', false));
        }

        // Prepare request body for the hotel details API call
        const requestBody = {
            Hotelcodes: hotelCode,
            Language: "EN"
        };

        // Make the API call to fetch hotel details
        const response = await axios.post(
            HOTEL_DETAILS_API_URL,
            requestBody,
            {
                auth: {
                    username: PREDEFINED_USERNAME,
                    password: PREDEFINED_PASSWORD
                }
            }
        );

        // Check and process the response data
        if (response.data && response.data.HotelDetails) {
            logger.info(`Successfully fetched details for hotelCode: ${hotelCode}`);
            return res
                .status(StatusCodes.OK)
                .json(httpFormatter(response.data.HotelDetails[0], 'Hotel details fetched successfully.', true));
        } else {
            logger.warn(`No details found for hotelCode: ${hotelCode}`);
            return res
                .status(StatusCodes.NOT_FOUND)
                .json(httpFormatter({}, 'No hotel details found for the specified hotel code.', false));
        }
    } catch (error) {
        logger.error(`Error fetching hotel details: ${error.message}`);
        return res
            .status(StatusCodes.INTERNAL_SERVER_ERROR)
            .json(httpFormatter({}, 'Internal server error.', false));
    }
};