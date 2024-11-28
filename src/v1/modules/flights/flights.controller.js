import dotenv from 'dotenv';
import axios from 'axios';
import City from '../../models/city.js'; 
import { Duffel } from '@duffel/api';
import logger from '../../../config/logger.js';
import { StatusCodes } from "http-status-codes";
import httpFormatter from "../../../utils/formatter.js";

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
        return amount; // Return the amount unchanged in case of an error
    }
}

async function fetchFlightDetails(fromCityId, toCityId, departureDate, adults, children) {
    try {
        const fromCityData = await City.findById(fromCityId).lean();
        const toCityData = await City.findById(toCityId).lean();

        if (!fromCityData || !toCityData) {
            return { error: 'City not found in the database.' };
        }

        const slices = [{
            origin: fromCityData.iataCode,
            destination: toCityData.iataCode,
            departure_date: departureDate
        }];

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
            fromCity: fromCityData.name,
            toCity: toCityData.name,
            departureDate,
            price: offer.total_amount,
            currency: offer.total_currency,
            airline: offer.slices[0].segments[0].marketing_carrier.name,
            flightSegments: offer.slices[0].segments.map(segment => ({
                img:segment.operating_carrier.logo_symbol_url,
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
        logger.error(`Error fetching flight details: ${error.message}`);
        return [];
    }
}

export const getFlights = async (req, res) => {
    try {
        const { departureCityId, arrivalCityId } = req.params;
        const { departureDate, adults = 1, children = 0 } = req.query;

        const flightDetails = await fetchFlightDetails(departureCityId, arrivalCityId, departureDate, adults, children);

        if (flightDetails.error) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, flightDetails.error, false));
        }

        const sortedFlights = flightDetails.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
        const topFlights = sortedFlights.slice(0, 5);

        const convertedFlights = await Promise.all(
            topFlights.map(async (flight) => {
                const priceInINR = await convertToINR(flight.price, flight.currency);
                return { ...flight, priceInINR: priceInINR.toFixed(2) };
            })
        );

        return res.status(StatusCodes.OK).json(httpFormatter({ flights: convertedFlights }, 'Flights fetched successfully', true));
    } catch (error) {
        logger.error('Error in getFlights:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};
