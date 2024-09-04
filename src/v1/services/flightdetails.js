import dotenv from 'dotenv';
import axios from 'axios';
import moment from 'moment';
import { Duffel } from '@duffel/api';

dotenv.config();

const duffel = new Duffel({
  token: process.env.DUFFEL_ACCESS_TOKEN
});

// Replace with your actual currency conversion API endpoint
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


  

async function fetchFlightDetails(fromCity, toCity, departureDate, adults, children,cityIATACodes) {
  try {
    const fromCityData = cityIATACodes.find(city => city.name.toLowerCase() === fromCity.toLowerCase());
    const toCityData = cityIATACodes.find(city => city.name.toLowerCase() === toCity.toLowerCase());

    if (!fromCityData || !toCityData) {
      throw new Error('City not found in the provided IATA codes list.');
    }

    const fromIATACode = fromCityData.iata_code;
    const toIATACode = toCityData.iata_code;

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
      cabin_class: 'economy' // Set the cabin class to economy
    });

    return response.data.offers.map(offer => ({
      fromCity,
      toCity,
      departureDate,
      price: offer.total_amount,
      currency: offer.total_currency,
      airline: offer.slices[0].segments[0].marketing_carrier.name,
      flightSegments: offer.slices[0].segments.map(segment => ({
        departure: segment.origin.iata_code,
        arrival: segment.destination.iata_code,
        departureTime: segment.departing_at,
        arrivalTime: segment.arriving_at,
        carrierCode: segment.marketing_carrier.iata_code,
        flightNumber: segment.marketing_carrier_flight_number
      }))
    }));
  } catch (error) {
    console.error(`Error fetching flight details from ${fromCity} to ${toCity}:`, error.message);
    return [];
  }
}

// Function to check if a flight fits within the free time window
function isFlightAfterLastActivity(flight, lastActivityEndTime) {
  const flightDepartureTime = moment(flight.flightSegments[0].departureTime);
  console.log(flightDepartureTime);
  return flightDepartureTime.isAfter(lastActivityEndTime.add(4, 'hours'));
}

export async function addFlightDetailsToItinerary(data, adults, children,cityIATACodes) {
  try {
    const { itinerary } = data;

    for (let i = 0; i < itinerary.length - 1; i++) {
      const currentCity = itinerary[i].current_city;
      const nextCity = itinerary[i + 1].current_city;

      if (itinerary[i].transport.mode === 'Flight') {
        // Get the last day's details for calculating the flight time
        const lastDay = itinerary[i].days[itinerary[i].days.length - 1];
        const lastActivityEndTime = moment(lastDay.date + ' ' + lastDay.activities[lastDay.activities.length - 1].end_time, 'YYYY-MM-DD h:mm A');
        
        // Fetch all available flights for the next city on the last day
        let flights = await fetchFlightDetails(currentCity, nextCity, lastDay.date, adults, children,cityIATACodes);
    
        // Filter flights based on whether they are after the last activity ends, with a 2-hour buffer
        let suitableFlights = flights.filter(flight => isFlightAfterLastActivity(flight, lastActivityEndTime));

        if (suitableFlights.length === 0) {
          // If no suitable flights are found, fetch flights for the next day
          const nextDay = moment(lastDay.date).add(1, 'days').format('YYYY-MM-DD');
          flights = await fetchFlightDetails(currentCity, nextCity, nextDay, adults, children,cityIATACodes);
          suitableFlights = flights; // All flights on the next day are considered suitable
        }

        if (suitableFlights.length > 0) {
          // Find the cheapest suitable flight
          const cheapestFlight = suitableFlights.reduce((prev, current) => {
            return parseFloat(prev.price) < parseFloat(current.price) ? prev : current;
          });

          // Convert the price to INR
          const priceInINR = await convertToINR(parseFloat(cheapestFlight.price), cheapestFlight.currency);

          itinerary[i].transport.mode_details = {
            ...cheapestFlight,
            priceInINR: priceInINR.toFixed(2)
          };
        } else {
          itinerary[i].transport.mode_details = 'No suitable flights found after the last activity.';
        }
      }
    }

    return { 
      ...data,
      itinerary 
    };
  } catch (error) {
    console.error("Error adding flight details:", error);
    return { error: "Error adding flight details" };
  }
}