import axios from 'axios';
import dotenv from 'dotenv';
import City from '../models/city.js'

dotenv.config();

const API_KEY = process.env.API_KEY; 
const HOTEL_API_URL = 'https://booking-com15.p.rapidapi.com/api/v1/hotels/searchHotelsByCoordinates';
const CONVERSION_API_URL = 'https://api.exchangerate-api.com/v4/latest/';
const BASE_CURRENCY = 'INR';

async function convertToINR(amount, currency) {
    try {
        const response = await axios.get(`${CONVERSION_API_URL}${currency}`);
        const rate = response.data.rates[BASE_CURRENCY];
        if (!rate) {
            throw new Error(`Conversion rate for ${currency} to INR not found.`);
        }
        return amount * rate;
    } catch (error) {
        console.error(`Error converting currency ${currency} to INR:`, error.message);
        return amount; 
    }
}

async function fetchHotelDetails(latitude, longitude, arrivalDate, departureDate) {
    try {
        const options = {
            method: 'GET',
            url: HOTEL_API_URL,
            params: {
                latitude,
                longitude,
                arrival_date: arrivalDate,
                departure_date: departureDate,
                radius: '10',
                adults: '1',
                children_age: '0',
                room_qty: '1',
                units: 'metric',
                page_number: '1',
                temperature_unit: 'c',
                languagecode: 'en-us',
                currency_code: 'USD' // Use USD for the initial response
            },
            headers: {
                'x-rapidapi-key': API_KEY,
                'x-rapidapi-host': 'booking-com15.p.rapidapi.com'
            }
        };

        const response = await axios.request(options);

        if (response.data && response.data.data && response.data.data.result) {
            const hotels = await Promise.all(response.data.data.result.map(async hotel => {
                const priceInINR = await convertToINR(parseFloat(hotel.min_total_price), hotel.currencycode);
                const roomType = hotel.unit_configuration_label || 'Unknown Room Type';
                const refundable = hotel.is_free_cancellable === 1;

                return {
                    name: hotel.hotel_name,
                    address: hotel.city_in_trans || 'Unknown Address',
                    rating: hotel.review_score,
                    price: priceInINR.toFixed(2),
                    currency: BASE_CURRENCY,
                    image: hotel.main_photo_url,
                    cancellation: hotel.is_free_cancellable ? 'Free cancellation available' : 'No free cancellation',
                    checkin: `${arrivalDate} ${hotel.checkin.from}`,
                    checkout: `${departureDate} ${hotel.checkout.until}`,
                    roomType: roomType,
                    refundable: refundable
                };
            }));

            if (hotels.length > 0) {
                const cheapestHotel = hotels.reduce((prev, current) => {
                    return parseFloat(prev.price) < parseFloat(current.price) ? prev : current;
                });

                return cheapestHotel;
            } else {
                console.warn('No hotels found in response data.');
                return null;
            }
        } else {
            console.warn('No results found in response data.');
            return null;
        }
    } catch (error) {
        console.error('Error fetching hotel details:', error.message);
        return null;
    }
}

export async function addHotelDetailsToItinerary(data) {
    try {
        const { itinerary } = data;

        for (let i = 0; i < itinerary.length; i++) {
            const currentCityName = itinerary[i].currentCity;

            // Fetch city details from the database
            const city = await City.findOne({ name: currentCityName });
            if (!city) {
                console.warn(`City ${currentCityName} not found in the database.`);
                itinerary[i].hotelDetails = 'City not found in the database.';
                continue;
            }

            const { latitude, longitude } = city;

            // Extract arrival and departure dates from days array
            const days = itinerary[i].days;
            const arrivalDate = days.length > 0 ? days[0].date : null;
            const departureDate = days.length > 0 ? days[days.length - 1].date : null;

            // Debug: Log the extracted dates
            console.log(`Arrival Date for ${currentCityName}:`, arrivalDate);
            console.log(`Departure Date for ${currentCityName}:`, departureDate);

            if (!arrivalDate || !departureDate) {
                itinerary[i].hotelDetails = 'No days found to determine arrival and departure dates.';
                continue;
            }

            // Fetch hotel details
            const currentCityHotel = await fetchHotelDetails(latitude, longitude, arrivalDate, departureDate);

            // Add hotel details to the itinerary
            itinerary[i].hotelDetails = currentCityHotel || 'No hotels found for the specified dates in current city.';
        }

        return {
            ...data,
            itinerary
        };
    } catch (error) {
        console.error("Error adding hotel details:", error.message);
        return { error: "Error adding hotel details" };
    }
}
