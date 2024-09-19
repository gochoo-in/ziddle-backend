import axios from 'axios';
import dotenv from 'dotenv';
import moment from 'moment';
import https from 'https';
import logger from '../../config/logger.js';
import Taxi from '../models/taxi.js'; 
import httpFormatter from '../../utils/formatter.js';

dotenv.config();

const API_KEY = process.env.API_KEY;
const REQUEST_LIMIT = 1000;
const RESET_INTERVAL = 3600000;

let requestCount = 0;
let resetTimestamp = Date.now();

async function rateLimitedFetch(options, retries = 3, delay = 1000) {
    return new Promise((resolve, reject) => {
        const now = Date.now();

        if (now > resetTimestamp) {
            requestCount = 0;
            resetTimestamp = now + RESET_INTERVAL;
        }

        if (requestCount >= REQUEST_LIMIT) {
            const timeUntilReset = resetTimestamp - now;
            logger.warn(`Rate limit reached. Waiting ${Math.ceil(timeUntilReset / 1000)} seconds...`);
            setTimeout(() => rateLimitedFetch(options, retries, delay).then(resolve).catch(reject), timeUntilReset);
            return;
        }

        requestCount++;

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(data);
                } else if (res.statusCode === 429 && retries > 0) {
                    logger.warn(`Rate limit exceeded. Retrying in ${delay} ms...`);
                    setTimeout(() => {
                        rateLimitedFetch(options, retries - 1, delay * 2).then(resolve).catch(reject);
                    }, delay);
                } else {
                    reject(new Error(`Request failed with status code ${res.statusCode}`));
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        req.end();
    });
}

async function searchLocation(query) {
    const options = {
        method: 'GET',
        hostname: 'booking-com15.p.rapidapi.com',
        path: `/api/v1/taxi/searchLocation?query=${encodeURIComponent(query)}`,
        headers: {
            'x-rapidapi-key': API_KEY,
            'x-rapidapi-host': 'booking-com15.p.rapidapi.com'
        }
    };

    try {
        const data = await rateLimitedFetch(options);
        const response = JSON.parse(data);

        if (response.status && response.data && response.data.length > 0) {
            return response.data[0].googlePlaceId;
        } else {
            logger.warn('No location found for query:', query);
            return null;
        }
    } catch (error) {
        logger.error('Error searching location:', { error: error.message });
        throw error;
    }
}

const CONVERSION_API_URL = 'https://api.exchangerate-api.com/v4/latest/';
const BASE_CURRENCY = process.env.BASE_CURRENCY;

async function convertToINR(amount, currency) {
    try {
        const response = await axios.get(`${CONVERSION_API_URL}${currency}`);
        const rate = response.data.rates[BASE_CURRENCY];
        return amount * rate;
    } catch (error) {
        logger.error(`Error converting currency ${currency} to INR:`, { error: error.message });
        return amount;
    }
}

async function fetchTaxiDetails(pickUpPlaceId, dropOffPlaceId, pickUpDate, pickUpTime, currencyCode) {
    try {
        const options = {
            method: 'GET',
            hostname: 'booking-com15.p.rapidapi.com',
            path: `/api/v1/taxi/searchTaxi?pick_up_place_id=${encodeURIComponent(pickUpPlaceId)}&drop_off_place_id=${encodeURIComponent(dropOffPlaceId)}&pick_up_date=${encodeURIComponent(pickUpDate)}&pick_up_time=${encodeURIComponent(pickUpTime)}&currency_code=${encodeURIComponent(currencyCode)}`,
            headers: {
                'x-rapidapi-key': API_KEY,
                'x-rapidapi-host': 'booking-com15.p.rapidapi.com'
            }
        };

        const response = await rateLimitedFetch(options);
        const data = JSON.parse(response);

        if (data && data.data && Array.isArray(data.data.results)) {
            return data.data.results.map(result => {
                const departureTime = data.data.journeys[0].requestedPickupDateTime || 'Unknown';
                const arrivalTime = departureTime !== 'Unknown' && result.duration
                    ? moment(departureTime).add(result.duration, 'minutes').format('YYYY-MM-DDTHH:mm:ss')
                    : 'Unknown';

                return {
                    transferId: result.resultId,
                    pickupLocation: data.data.journeys[0].pickupLocation ? data.data.journeys[0].pickupLocation.name : 'Unknown',
                    dropoffLocation: data.data.journeys[0].dropOffLocation ? data.data.journeys[0].dropOffLocation.name : 'Unknown',
                    departureTime: departureTime,
                    duration: result.duration || 0,
                    arrivalTime: arrivalTime,
                    vehicleType: result.vehicleType || 'Unknown',
                    passengerCount: result.passengerCapacity || 0,
                    luggageAllowed: result.bags || 0,
                    price: result.price.amount ? result.price.amount.toString() : "0", // Convert to string
                    currency: result.price.currencyCode || 'Unknown',
                    sharedTransfer: false
                };
            });
        } else {
            logger.warn('Invalid response data structure for taxi details.');
            return [];
        }
    } catch (error) {
        logger.error('Error fetching taxi details:', { error: error.message });
        throw error;
    }
}

export async function addTaxiDetailsToItinerary(data, currencyCode = 'INR') {
    try {
        const { itinerary } = data;

        for (let i = 0; i < itinerary.length - 1; i++) {
            const currentCity = itinerary[i].currentCity;
            const nextCity = itinerary[i + 1].currentCity;

            if (itinerary[i].transport && itinerary[i].transport.mode === 'Car') {
                try {
                    const lastDay = itinerary[i].days[itinerary[i].days.length - 1];
                    const nextDay = moment(lastDay.date).add(1, 'days').format('YYYY-MM-DD');

                    const pickUpPlaceId = await searchLocation(currentCity);
                    const dropOffPlaceId = await searchLocation(nextCity);

                    if (!pickUpPlaceId || !dropOffPlaceId) {
                        itinerary[i].transport.modeDetails = null;
                        continue;
                    }

                    const taxis = await fetchTaxiDetails(pickUpPlaceId, dropOffPlaceId, nextDay, '10:00', currencyCode);

                    if (taxis.length > 0) {
                        const cheapestTaxi = taxis.reduce((prev, current) => (current.price < prev.price ? current : prev));
                        let priceInINR = await convertToINR(cheapestTaxi.price, cheapestTaxi.currency);

                        // Ensure the price is a valid string
                        priceInINR = isNaN(priceInINR) ? "0" : priceInINR.toFixed(2).toString(); // Ensure it's a string

                        const newTaxi = new Taxi({
                            ...cheapestTaxi,
                            price: priceInINR, // Stored as a string
                            currency: 'INR' // Store price in INR
                        });

                        const savedTaxi = await newTaxi.save();

                        itinerary[i].transport.modeDetails = savedTaxi._id;
                    } else {
                        itinerary[i].transport.modeDetails = null;
                    }
                } catch (innerError) {
                    logger.error(`Error processing taxi details for leg ${i}:`, { error: innerError.message });
                    itinerary[i].transport.modeDetails = null;
                }
            }
        }

        return {
            ...data,
            itinerary
        };
    } catch (error) {
        logger.error("Error adding taxi details to itinerary:", { error: error.message });
        return httpFormatter(null, 'Error adding taxi details to itinerary', false);
    }
}
