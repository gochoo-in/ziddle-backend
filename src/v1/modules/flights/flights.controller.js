import { fetchFlightDetails } from '../../services/flightdetails.js';
import { StatusCodes } from 'http-status-codes';
import httpFormatter from "../../../utils/formatter.js";
import logger from "../../../config/logger.js";
import City from '../../models/city.js';
import InternationalAirportCity from '../../models/internationalAirportCity.js'; 

export const getFlights = async (req, res) => {
    try {
        const { departureCityId, arrivalCityId } = req.params; 
        const { departureDate, adults = 1, children = 0, childrenAges = [] } = req.query;

        let departureCityData = await City.findById(departureCityId) || await InternationalAirportCity.findById(departureCityId);
        let arrivalCityData = await City.findById(arrivalCityId) || await InternationalAirportCity.findById(arrivalCityId);

        if (!departureCityData || !arrivalCityData) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'City not found in the database.', false));
        }

        const departureIATA = departureCityData.nearbyInternationalAirportCity 
            ? departureCityData.nearbyInternationalAirportCity.iataCode 
            : departureCityData.iataCode;

        const arrivalIATA = arrivalCityData.nearbyInternationalAirportCity 
            ? arrivalCityData.nearbyInternationalAirportCity.iataCode 
            : arrivalCityData.iataCode;

        const departureCityName  = departureCityData.name;
        const arrivalCityName = arrivalCityData.name;

        const cityIataCodes = [
            { name: departureCityName, iataCode: departureIATA },
            { name: arrivalCityName, iataCode: arrivalIATA }
        ];

        const flightDetails = await fetchFlightDetails(
            departureCityName,  
            arrivalCityName,    
            departureDate, 
            adults, 
            children, 
            childrenAges, 
            cityIataCodes 
        );

        if (flightDetails.length === 0) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'No flights found for the provided cities and date.', false));
        }

        // Sort flights by price
        const sortedFlights = flightDetails.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));

        // Get the 2 cheapest, 2 expensive, and 1 mid-range flight
        const cheapestFlights = sortedFlights.slice(0, 2);
        const expensiveFlights = sortedFlights.slice(-2);
        const midrangeFlight = sortedFlights[Math.floor(sortedFlights.length / 2)];

        // Prepare the response with selected flights
        const selectedFlights = [...cheapestFlights, ...expensiveFlights, midrangeFlight];

        return res.status(StatusCodes.OK).json(httpFormatter({ flights: selectedFlights }, 'Flight details fetched successfully.', true));
    } catch (error) {
        logger.error('Error in getFlights:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};
