import dotenv from 'dotenv';
import axios from 'axios';
import moment from 'moment';
import { Duffel } from '@duffel/api';
import logger from '../../config/logger.js';
import Flight from '../models/flight.js'; 
dotenv.config();

const duffel = new Duffel({
    token: process.env.DUFFEL_ACCESS_TOKEN
});

const CONVERSION_API_URL = process.env.CONVERSION_API_URL;
const BASE_CURRENCY = 'INR';

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

async function fetchFlightDetails(fromCity, toCity, departureDate, adults, children, cityIATACodes) {
    try {
        const fromCityData = cityIATACodes.find(city => city.name.toLowerCase() === fromCity.toLowerCase());
        const toCityData = cityIATACodes.find(city => city.name.toLowerCase() === toCity.toLowerCase());

        if (!fromCityData || !toCityData) {
            throw new Error('City not found in the provided IATA codes list.');
        }

        const fromIATACode = fromCityData.iataCode;
        const toIATACode = toCityData.iataCode;

        const slices = [
            {
                origin: fromIATACode,
                destination: toIATACode,
                departure_date: departureDate
            }
        ];

        const passengers = [
            ...Array(adults).fill({ type: "adult" }),
            ...Array(children).fill({ type: "child" })
        ];

        const response = await duffel.offerRequests.create({
            slices,
            passengers,
            cabin_class: 'economy' 
        });

        return response.data.offers.map(offer => ({
            fromCity,
            toCity,
            departureDate,
            price: offer.total_amount,
            currency: offer.total_currency,
            airline: offer.slices[0].segments[0].marketing_carrier.name,
            flightSegments: offer.slices[0].segments.map(segment => ({
                departure: segment.origin.iataCode,
                arrival: segment.destination.iataCode,
                departureTime: segment.departing_at,
                arrivalTime: segment.arriving_at,
                carrierCode: segment.marketing_carrier.iataCode,
                flightNumber: segment.marketing_carrier_flight_number,
                baggage: segment.passengers[0].baggages
            }))
        }));
    } catch (error) {
        logger.error(`Error fetching flight details from ${fromCity} to ${toCity}:`, error.message);
        return [];
    }
}

function isFlightAfterLastActivity(flight, lastActivityEndTime) {
    const flightDepartureTime = moment(flight.flightSegments[0].departureTime);
    return flightDepartureTime.isAfter(lastActivityEndTime.add(4, 'hours'));
}

export async function addFlightDetailsToItinerary(data, adults, children, cityIATACodes) {
    try {
        const { itinerary } = data;

        for (let i = 0; i < itinerary.length - 1; i++) {
            const currentCity = itinerary[i].currentCity;
            const nextCity = itinerary[i + 1].currentCity;

            if (itinerary[i].transport && itinerary[i].transport.mode === 'Flight') { 
                const lastDay = itinerary[i].days[itinerary[i].days.length - 1];

                const nextDay = moment(lastDay.date).add(1, 'days').format('YYYY-MM-DD');
                const flights = await fetchFlightDetails(currentCity, nextCity, nextDay, adults, children, cityIATACodes);

                if (flights.length > 0) {
                    const cheapestFlight = flights.reduce((prev, current) => {
                        return parseFloat(prev.price) < parseFloat(current.price) ? prev : current;
                    });

                    const priceInINR = await convertToINR(parseFloat(cheapestFlight.price), cheapestFlight.currency);

                    const departureDate = cheapestFlight.flightSegments[0].departureTime; 

                    const newFlight = new Flight({
                        departureCityId: cityIATACodes.find(city => city.name === cheapestFlight.fromCity)._id,
                        arrivalCityId: cityIATACodes.find(city => city.name === cheapestFlight.toCity)._id,
                        baggageIncluded: cheapestFlight.flightSegments.some(segment => segment.baggage.length > 0),
                        baggageDetails: {
                            cabinBag: cheapestFlight.flightSegments[0].baggage.find(bag => bag.type === 'carry_on')?.quantity || 0,
                            checkedBag: cheapestFlight.flightSegments[0].baggage.find(bag => bag.type === 'checked')?.quantity || 0
                        },
                        price: priceInINR,
                        currency: 'INR', 
                        airline: cheapestFlight.airline,
                        departureDate: departureDate,
                        flightSegments: cheapestFlight.flightSegments.map(segment => ({
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
