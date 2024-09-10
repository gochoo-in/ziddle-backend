import axios from 'axios';
import dotenv from 'dotenv';
import moment from 'moment';
import https from 'https';

dotenv.config();

const API_KEY = process.env.API_KEY; // Securely access your API key from environment variables
const REQUEST_LIMIT = 1000; // Rate limit
const RESET_INTERVAL = 3600000; // 1 hour in milliseconds

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
            console.log(`Rate limit reached. Waiting ${Math.ceil(timeUntilReset / 1000)} seconds...`);
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
                    console.log('Rate limit exceeded. Retrying in ' + delay + 'ms...');
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
            throw new Error('No results found or error in response.');
        }
    } catch (error) {
        console.error('Error searching location:', error.message);
        throw error; // Rethrow error to be handled by the caller
    }
}

const CONVERSION_API_URL = 'https://api.exchangerate-api.com/v4/latest/';
const BASE_CURRENCY = 'INR';

async function convertToINR(amount, currency) {
    try {
        const response = await axios.get(`${CONVERSION_API_URL}${currency}`);
        const rate = response.data.rates[BASE_CURRENCY];
        return amount * rate;
    } catch (error) {
        console.error(`Error converting currency ${currency} to INR:`, error.message);
        return amount; // Return the amount unchanged in case of an error
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

        return data.results.map(result => ({
            transferId: result.resultId,
            pickupLocation: result.pickupLocation ? result.pickupLocation.description : 'Unknown',
            dropoffLocation: result.dropOffLocation ? result.dropOffLocation.description : 'Unknown',
            departureTime: result.departureTime || 'Unknown',
            duration: result.duration || 0,
            arrivalTime: moment(result.departureTime).clone().add(result.duration, 'minutes').format('YYYY-MM-DDTHH:mm:ss'),
            vehicleType: result.vehicleType || 'Unknown',
            passengerCount: result.passengerCapacity || 0,
            luggageAllowed: result.bags || 0,
            price: parseFloat(result.price.amount) || 0,
            currency: result.price.currencyCode || 'Unknown',
            sharedTransfer: false
        }));
    } catch (error) {
        console.error('Error fetching taxi details:', error.message);
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
                const lastDay = itinerary[i].days[itinerary[i].days.length - 1];
                const nextDay = moment(lastDay.date).add(1, 'days').format('YYYY-MM-DD');

                const pickUpPlaceId = await searchLocation(currentCity);
                const dropOffPlaceId = await searchLocation(nextCity);

                if (!pickUpPlaceId || !dropOffPlaceId) {
                    itinerary[i].transport.modeDetails = 'Unable to find location details.';
                    continue;
                }

                const taxis = await fetchTaxiDetails(pickUpPlaceId, dropOffPlaceId, nextDay, '10:00', currencyCode);

                if (taxis.length > 0) {
                    const cheapestTaxi = taxis.reduce((prev, current) => (current.price < prev.price ? current : prev));

                    const priceInINR = await convertToINR(cheapestTaxi.price, cheapestTaxi.currency);

                    itinerary[i].transport.modeDetails = {
                        ...cheapestTaxi,
                        priceInINR: priceInINR.toFixed(2)
                    };
                } else {
                    itinerary[i].transport.modeDetails = 'No taxis found for the next day after the last activity.';
                }
            }
        }

        return { ...data, itinerary };
    } catch (error) {
        console.error("Error adding taxi details:", error.message);
        return { error: "Error adding taxi details" };
    }
}
