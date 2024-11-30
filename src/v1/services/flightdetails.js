import dotenv from 'dotenv';
import axios from 'axios';
import moment from 'moment';
import logger from '../../config/logger.js';
import Flight from '../models/flight.js';

dotenv.config();

const CONVERSION_API_URL = process.env.CONVERSION_API_URL;
const BASE_CURRENCY = 'INR';
const TBO_API_URL = process.env.TBO_FLIGHT_SEARCH_API;
const AUTH_URL = process.env.TBO_AUTH_URL;
const TBO_CLIENT_ID = process.env.TBO_CLIENT_ID
const TBO_USERNAME = process.env.TBO_USERNAME
const TBO_PASSWORD = process.env.TBO_PASSWORD

// Server IP address from .env
const SERVER_IP = process.env.SERVER_IP;

let TBO_TOKEN = null;
let LAST_TOKEN_FETCH = null;

async function authenticateTBO() {
    try {
        const requestBody = {
            ClientId: TBO_CLIENT_ID,
            UserName: TBO_USERNAME,
            Password: TBO_PASSWORD,
            EndUserIp: SERVER_IP
        };

        const response = await axios.post(AUTH_URL, requestBody);
        if (response.data && response.data.Status === 1) {
            TBO_TOKEN = response.data.TokenId;
            LAST_TOKEN_FETCH = moment();
            logger.info(`Authenticated with TBO API.`);
        } else {
            logger.error(`Authentication failed: ${response.data.Error.ErrorMessage}`);
        }
    } catch (error) {
        logger.error("Error authenticating with TBO API:", error.message);
    }
}

async function getTBOToken() {
    // Check if token needs to be refreshed
    if (!TBO_TOKEN || !LAST_TOKEN_FETCH || moment().diff(LAST_TOKEN_FETCH, 'hours') >= 6) {
        await authenticateTBO();
    }
    return TBO_TOKEN;
}

async function convertToINR(amount, currency) {
    try {
        const response = await axios.get(`${CONVERSION_API_URL}${currency}`);
        const rate = response.data.rates[BASE_CURRENCY];
        return amount * rate;
    } catch (error) {
        logger.error(`Error converting currency ${currency} to INR:`, error.message);
        return amount;
    }
}

export async function fetchFlightDetails(fromCity, toCity, departureDate, adults, children, childrenAges, cityIATACodes) {
    console.log(fromCity, toCity, departureDate, adults, children, childrenAges, cityIATACodes)
    try {
        const fromCityData = cityIATACodes.find(city => city.name.toLowerCase() === fromCity.toLowerCase());
        const toCityData = cityIATACodes.find(city => city.name.toLowerCase() === toCity.toLowerCase());

        if (!fromCityData || !toCityData) {
            throw new Error('City not found in the provided IATA codes list.');
        }

        const fromIATACode = fromCityData.iataCode;
        const toIATACode = toCityData.iataCode;

        const token = await getTBOToken();

        const requestBody = {
            EndUserIp: SERVER_IP,
            TokenId: token,
            AdultCount: adults.toString(),
            ChildCount: children.toString(),
            InfantCount: '0',
            DirectFlight: 'false',
            OneStopFlight: 'false',
            JourneyType: '1',
            Segments: [
                {
                    Origin: fromIATACode,
                    Destination: toIATACode,
                    FlightCabinClass: '1',
                    PreferredDepartureTime: `${departureDate}`
                }
            ]
        };

        const response = await axios.post(TBO_API_URL, requestBody);
        const flights = response.data.Response.Results;

        if (!flights || flights.length === 0) {
            return [];
        }
        

        // Flatten the nested arrays and map the response to include necessary flight details
        return flights.flatMap(innerArray => 
            innerArray.map(offer => {
                const publishedFare = offer.Fare && offer.Fare.PublishedFare != null ? offer.Fare.PublishedFare : Infinity;
                return {
                    fromCity,
                    toCity,
                    departureDate,
                    price: publishedFare,
                    currency: offer.Fare?.Currency || BASE_CURRENCY,
                    airline: offer.Segments[0][0].Airline.AirlineName,
                    flightSegments: offer.Segments[0].map(segment => ({
                        img: null, // Placeholder as TBO response doesn't include logo URL
                        departure: segment.Origin.Airport.AirportCode,
                        arrival: segment.Destination.Airport.AirportCode,
                        departureTime: segment.Origin.DepTime,
                        arrivalTime: segment.Destination.ArrTime,
                        carrierCode: segment.Airline.AirlineCode,
                        flightNumber: segment.Airline.FlightNumber,
                        baggage: {
                            cabinBag: segment.CabinBaggage || "N/A",
                            checkedBag: segment.Baggage || "N/A"
                        }
                    }))
                };
            })
        );
    } catch (error) {
        logger.error(`Error fetching flight details from ${fromCity} to ${toCity}:`, error);
        return [];
    }
}

export async function addFlightDetailsToItinerary(data, adults, children, childrenAges, cityIATACodes) {
    try {
        const { itinerary } = data;
        for (let i = 0; i < itinerary.length - 1; i++) {
            const currentCity = itinerary[i].currentCity;
            const nextCity = itinerary[i + 1].currentCity;

            if (itinerary[i].transport && itinerary[i].transport.mode === 'Flight') {
                const lastDay = itinerary[i].days[itinerary[i].days.length - 1];
                const nextDay = moment(lastDay.date).add(1, 'days').format('YYYY-MM-DD');
                const flights = await fetchFlightDetails(currentCity, nextCity, nextDay, adults, children, childrenAges, cityIATACodes);

                if (flights.length > 0) {
                    const cheapestFlight = flights.reduce((prev, current) => {
                        return parseFloat(prev.price) < parseFloat(current.price) ? prev : current;
                    });

                    const priceInINR = await convertToINR(parseFloat(cheapestFlight.price), cheapestFlight.currency);
                    const departureDate = cheapestFlight.flightSegments[0].departureTime;

                    const newFlight = new Flight({
                        departureCityId: cityIATACodes.find(city => city.name === cheapestFlight.fromCity)._id,
                        arrivalCityId: cityIATACodes.find(city => city.name === cheapestFlight.toCity)._id,
                        baggageIncluded: cheapestFlight.flightSegments.some(segment => segment.baggage.checkedBag !== "N/A"),
                        baggageDetails: {
                            cabinBag: cheapestFlight.flightSegments[0].baggage.cabinBag,
                            checkedBag: cheapestFlight.flightSegments[0].baggage.checkedBag
                        },
                        price: priceInINR,
                        currency: 'INR',
                        airline: cheapestFlight.airline,
                        departureDate: departureDate,
                        flightSegments: cheapestFlight.flightSegments.map(segment => ({
                            img: segment.img,
                            departureTime: segment.departureTime,
                            arrivalTime: segment.arrivalTime,
                            flightNumber: segment.flightNumber
                        }))
                    });

                    const savedFlight = await newFlight.save();
                    itinerary[i].transport.modeDetails = savedFlight._id;
                } else {
                    itinerary[i].transport.modeDetails = null;
                }
            }
        }

        return {
            ...data,
            itinerary
        };
    } catch (error) {
        logger.error("Error adding flight details:", error);
        return { error: "Error adding flight details" };
    }
}

function isFlightAfterLastActivity(flight, lastActivityEndTime) {
    const flightDepartureTime = moment(flight.flightSegments[0].departureTime);
    return flightDepartureTime.isAfter(lastActivityEndTime.add(4, 'hours'));
}
