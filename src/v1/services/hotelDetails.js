import axios from 'axios';
import dotenv from 'dotenv';
import City from '../models/city.js';
import Hotel from '../models/hotel.js';
import logger from '../../config/logger.js'; 


dotenv.config();

const API_KEY = process.env.API_KEY; 
const HOTEL_API_URL = process.env.HOTEL_API_URL;
const CONVERSION_API_URL = process.env.CONVERSION_API_URL;
const BASE_CURRENCY = 'INR';
const PREDEFINED_USERNAME = process.env.TBO_HOTEL_PREDEFINED_USERNAME
const PREDEFINED_PASSWORD = process.env.TBO_HOTEL_PREDEFINED_PASSWORD

async function convertToINR(amount, currency) {
    try {
        const response = await axios.get(`${CONVERSION_API_URL}${currency}`);
        const rate = response.data.rates[BASE_CURRENCY];
        if (!rate) {
            throw new Error(`Conversion rate for ${currency} to INR not found.`);
        }
        return amount * rate;
    } catch (error) {
        logger.error(`Error converting currency ${currency} to INR: ${error.message}`);
        return amount; 
    }
}


async function getHotelCodes(cityCode) {
    
    try {
        const response = await axios.post(
            'http://api.tbotechnology.in/TBOHolidays_HotelAPI/TBOHotelCodeList',
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
        const response = await axios.get('http://api.tbotechnology.in/TBOHolidays_HotelAPI/CountryList', {
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
            'http://api.tbotechnology.in/TBOHolidays_HotelAPI/CityList',
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


// Function to fetch hotel details by hotel codes
async function getHotelDetailsByCodes(checkIn, checkOut, hotelCodes, guestNationality, adults, childrenAges) {

    const  formattedCheckIn= checkIn.toISOString().split("T")[0];
    const formattedCheckOut = checkOut.toISOString().split("T")[0];
  
    try {
        const response = await axios.post(
            'https://affiliate.tektravels.com/HotelAPI/Search',
            {
                CheckIn: formattedCheckIn,
                CheckOut: formattedCheckOut,
                HotelCodes: hotelCodes.join(','),  
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
                    username: 'Yokuverse',
                    password: 'Yokuverse@1234'
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
            'http://api.tbotechnology.in/TBOHolidays_HotelAPI/Hoteldetails',
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
        if (error.response) {
            console.error("Response error:", error.response.status, error.response.data);
        } else {
            console.error("Error:", error.message);
        }
        return null;
    }
    
}





export default async function fetchHotelDetails(latitude, longitude, arrivalDate, departureDate, adults, childrenAges, roomQty = 1, cityId, cityCode) {
    try {
        const childrenAgesString = Array.isArray(childrenAges) && childrenAges.length > 0 ? childrenAges.join(',') : '0';

        // Fetch hotel codes for the specified city code
        const hotelCodes = await getHotelCodes(cityCode);
        if (hotelCodes) {
        } else {
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

        // Find the cheapest hotel based on TotalFare
        let cheapestHotel = null;
        hotelDetails.forEach(hotel => {
            hotel.Rooms.forEach(room => {
                if (!cheapestHotel || room.TotalFare < cheapestHotel.Rooms[0].TotalFare) {
                    cheapestHotel = hotel;
                }
            });
        });

        // Fetch and log detailed information for the cheapest hotel
        if (cheapestHotel) {
           

            // Fetch and log additional details for the cheapest hotel
            const detailedHotelInfo = await getHotelDetails(cheapestHotel.HotelCode);

            

            return {
                name: detailedHotelInfo.HotelDetails[0].HotelName||'Unknown Name',
                address: detailedHotelInfo.HotelDetails[0].Address || 'Unknown Address',
                rating: detailedHotelInfo.HotelDetails[0].HotelRating || 5,
                price: cheapestHotel.Rooms[0].TotalFare,
                currency: cheapestHotel.Currency,
                image: detailedHotelInfo.HotelDetails[0]?.Images[0] || 'https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg',
                cancellation: cheapestHotel.Rooms[0].CancelPolicies ? 'Cancellation available' : 'No free cancellation',
                checkin : `${arrivalDate} ${detailedHotelInfo.HotelDetails[0]?.CheckInTime ?? '12:00 AM'}`,
                checkout : `${departureDate} ${detailedHotelInfo.HotelDetails[0]?.CheckOutTime ?? '12:00 PM'}`,
                roomType: cheapestHotel.Rooms[0].Name[0],
                refundable: cheapestHotel.Rooms[0].IsRefundable,
                cityId: cityId 
            };



        } else {
            console.warn('No valid hotel data to determine the cheapest hotel.');
        }


        

        return cheapestHotel;
    } catch (error) {
        console.error('Error fetching hotel details:', { message: error.message });
        return null;
    }
}





export async function addHotelDetailsToItinerary(data, adults, childrenAges, rooms) {
    try {
        const { itinerary } = data;

        for (let i = 0; i < itinerary.length; i++) {
            const currentCityName = itinerary[i].currentCity;
            const city = await City.findOne({ name: currentCityName });
            if (!city) {
                logger.warn(`City ${currentCityName} not found in the database.`);
                itinerary[i].hotelDetails = null;
                continue;
            }

            const { country } = city; // assuming city has countryName field

            if (!country) {
                logger.warn(`Country for city ${currentCityName} not found in the database.`);
                itinerary[i].hotelDetails = null;
                continue;
            }

            const countryCode = await getCountryCode(country);
            if (!countryCode) {
                itinerary[i].hotelDetails = null;
                continue;
            }

            const cityCode = await getCityCode(countryCode, currentCityName);
            if (!cityCode) {
                itinerary[i].hotelDetails = null;
                continue;
            }

            const { latitude, longitude } = city;
            const roomQty = rooms;
            const days = itinerary[i].days;
            const arrivalDate = days.length > 0 ? days[0].date : null;
            const departureDate = days.length > 0 ? days[days.length - 1].date : null;

            logger.debug(`Arrival Date for ${currentCityName}: ${arrivalDate}`);
            logger.debug(`Departure Date for ${currentCityName}: ${departureDate}`);

            if (!arrivalDate || !departureDate) {
                itinerary[i].hotelDetails = 'No days found to determine arrival and departure dates.';
                continue;
            }

            // Pass city ID and country code to fetchHotelDetails function if required
            const currentCityHotel = await fetchHotelDetails(latitude, longitude, arrivalDate, departureDate, adults, childrenAges, roomQty, city._id,cityCode);

            if (currentCityHotel) {
                const newHotel = new Hotel(currentCityHotel);
                const savedHotel = await newHotel.save();
                itinerary[i].hotelDetails = savedHotel._id;
            } else {
                itinerary[i].hotelDetails = null;
            }
        }

        return {
            ...data,
            itinerary
        };
    } catch (error) {
        logger.error("Error adding hotel details:", { message: error.message });
        return { error: "Error adding hotel details" };
    }
}

