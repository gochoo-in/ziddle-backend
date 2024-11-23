import City from '../models/city.js';
import { addNewDaysToCity } from '../../utils/itineraryUtils.js';
import { createLeisureActivityIfNotExist } from '../../utils/activityUtils.js';
import { addDatesToItinerary } from '../../utils/dateUtils.js';
import { addFlightDetailsToItinerary, fetchFlightDetails } from '../services/flightdetails.js';
import { addHotelDetailsToItinerary } from '../services/hotelDetails.js';
import { addTaxiDetailsToItinerary } from '../services/taxiDetails.js';
import {addFerryDetailsToItinerary} from '../../utils/dummyData.js'
import Flight from '../models/flight.js'
import Taxi from '../models/taxi.js'
import Hotel from '../models/hotel.js'
import moment from 'moment';
import InternationalAirportCity from '../models/internationalAirportCity.js';
export const addDaysToCityService = async (itinerary, cityIndex, additionalDays) => {
  if (!itinerary || !itinerary.enrichedItinerary || !itinerary.enrichedItinerary.itinerary) {
    throw new Error('Itinerary or enrichedItinerary is not properly defined.');
  }

  if (cityIndex >= itinerary.enrichedItinerary.itinerary.length) {
    throw new Error('Invalid city index');
  }

  const cityName = itinerary.enrichedItinerary.itinerary[cityIndex].currentCity;

  // Fetch city details from the City model
  const city = await City.findOne({ name: cityName });
  if (!city) {
    throw new Error(`City not found for name: ${cityName}`);
  }

  // Get leisure activity, create one if it doesn't exist
  const leisureActivityId = await createLeisureActivityIfNotExist(city._id);

  // Get the first day of the itinerary
  const firstDayOfItinerary = itinerary.enrichedItinerary.itinerary[0].days[0];
  const startDay = new Date(firstDayOfItinerary.date);

  // Add new days to the city
  const updatedItinerary = addNewDaysToCity(
    itinerary.enrichedItinerary, 
    cityIndex, 
    additionalDays, 
    leisureActivityId
  );

  // Recalculate dates for the entire itinerary
  const finalItinerary = addDatesToItinerary(updatedItinerary, startDay);

  return { enrichedItinerary: finalItinerary };
};




export const refetchFlightAndHotelDetails = async (itinerary, requestData) => {
  const { adults, children, childrenAges, rooms } = requestData;

  if (!itinerary || !itinerary.enrichedItinerary || !itinerary.enrichedItinerary.itinerary) {
    throw new Error('Itinerary or enrichedItinerary is not properly defined.');
  }

  itinerary=itinerary.enrichedItinerary
  
  const { departureCity, arrivalCity} = itinerary;
  console.log(itinerary)
  console.log(departureCity, arrivalCity)
  // Fetch IATA codes from the City database
  const cityNames = itinerary.itinerary.map(city => city.currentCity);

  // Find all city details in one go based on city names
  const cityDetails = await City.find({ name: { $in: cityNames } });

  if (cityDetails.length === 0) {
    throw new Error('No city details found for the itinerary');
  }
  await deleteOldDetails(itinerary);
  // Refetch flight details
  const itineraryWithFlights = await addFlightDetailsToItinerary(
    itinerary,
    adults,
    children,
    childrenAges,
    cityDetails// Use the cities with fetched IATA codes
  );

  // Refetch taxi details
  const itineraryWithTaxi = await addTaxiDetailsToItinerary(itineraryWithFlights);
  const itineraryWithFerry = await addFerryDetailsToItinerary(itineraryWithTaxi);
  // Refetch hotel details
  let itineraryWithHotels = await addHotelDetailsToItinerary(itineraryWithFerry, adults, childrenAges, rooms);

  console.log("hatt", itinerary)

  
    itineraryWithHotels = await updateInternationalFlights(itineraryWithHotels, requestData, cityDetails, departureCity, arrivalCity);
  return itineraryWithHotels;
};

const updateInternationalFlights = async (itinerary, requestData, cityDetails, departureCity, arrivalCity) => {
  console.log("called")
  const { adults, children, childrenAges } = requestData;

  console.log(departureCity, arrivalCity)

  const departureCityData = await InternationalAirportCity.findOne({ name: departureCity });
  const arrivalCityData = await InternationalAirportCity.findOne({ name: arrivalCity });

  // Extract first and last city details
  const firstCity = itinerary.itinerary[0];
  const lastCity = itinerary.itinerary.at(-1);

  const firstCityData = cityDetails.find(city => city.name === firstCity.currentCity);
  const lastCityData = cityDetails.find(city => city.name === lastCity.currentCity);

  if (!departureCityData || !arrivalCityData || !firstCityData || !lastCityData) {
    throw new Error('City or airport data is missing for international flights.');
  }

  const firstCityNearbyAirport = firstCityData.nearbyInternationalAirportCity;
  const lastCityNearbyAirport = lastCityData.nearbyInternationalAirportCity;

  const firstCityDate = firstCity.days[0].date; // First city's first day date
  const lastCityDate = lastCity.days.at(-1).date; // Last city's last day date
  const cityIATACodesToFirst = [
    { name: departureCity, iataCode: departureCityData.iataCode },
    { name: firstCityNearbyAirport.name, iataCode: firstCityNearbyAirport.iataCode },
  ];

  const cityIATACodesToArrival = [
    { name: lastCityNearbyAirport.name, iataCode: lastCityNearbyAirport.iataCode },
    { name: arrivalCity, iataCode: arrivalCityData.iataCode },
  ];

  const flightsToFirstNearby = await fetchFlightDetails(
    departureCity,
    firstCityNearbyAirport.name,
    firstCityDate,
    adults,
    children,
    childrenAges,
    cityIATACodesToFirst
  );
  console.log(lastCityDate)
  const nextTravelDate = moment(lastCityDate).add(1, 'days').format('YYYY-MM-DD');

  const flightsToArrival = await fetchFlightDetails(
    lastCityNearbyAirport.name,
    arrivalCity,
    nextTravelDate,
    adults,
    children,
    childrenAges,
    cityIATACodesToArrival
  );

  // Initialize an array to store international flight IDs
  let internationalFlightIds = [];

  // Find and save the cheapest flights
  const cheapestFlightToFirstNearby =
          flightsToFirstNearby.length > 0
            ? flightsToFirstNearby.reduce((prev, curr) => (prev.price < curr.price ? prev : curr))
            : null;
    
        const cheapestFlightToArrival =
          flightsToArrival.length > 0
            ? flightsToArrival.reduce((prev, curr) => (prev.price < curr.price ? prev : curr))
            : null;

  if (cheapestFlightToFirstNearby) {
    const flightToFirstNearbyDetails = await new Flight({
      departureCityId: departureCityData._id,
      arrivalCityId: firstCityData._id,
      cityModelType: 'InternationalAirportCity',
      baggageIncluded: cheapestFlightToFirstNearby.flightSegments.some(
        segment => segment.baggage && segment.baggage.checkedBag !== 'N/A'
      ),
      baggageDetails: {
        cabinBag: cheapestFlightToFirstNearby.flightSegments[0]?.baggage?.cabinBag || 'N/A',
        checkedBag: cheapestFlightToFirstNearby.flightSegments[0]?.baggage?.checkedBag || 'N/A',
      },
      price: cheapestFlightToFirstNearby.price,
      currency: cheapestFlightToFirstNearby.currency || 'INR',
      airline: cheapestFlightToFirstNearby.airline,
      departureDate: cheapestFlightToFirstNearby.flightSegments[0]?.departureTime || null,
      flightSegments: cheapestFlightToFirstNearby.flightSegments.map(segment => ({
        img: segment.img || null,
        departureTime: segment.departureTime,
        arrivalTime: segment.arrivalTime,
        flightNumber: segment.flightNumber.toString(),
      })),
    }).save();

    internationalFlightIds.push(flightToFirstNearbyDetails._id);
  }
  console.log("cheapestFlightToFirstNearby", cheapestFlightToFirstNearby)


  if (cheapestFlightToArrival) {
    const date = new Date(cheapestFlightToArrival.flightSegments[0]?.departureTime);
    const newDate = date.toLocaleDateString("default")
    const flightToArrivalDetails = await new Flight({
      departureCityId: lastCityData._id,
      arrivalCityId: arrivalCityData._id,
      cityModelType: 'InternationalAirportCity',
      baggageIncluded: cheapestFlightToArrival.flightSegments.some(
        segment => segment.baggage && segment.baggage.checkedBag !== 'N/A'
      ),
      baggageDetails: {
        cabinBag: cheapestFlightToArrival.flightSegments[0]?.baggage?.cabinBag || 'N/A',
        checkedBag: cheapestFlightToArrival.flightSegments[0]?.baggage?.checkedBag || 'N/A',
      },
      price: cheapestFlightToArrival.price,
      currency: cheapestFlightToArrival.currency || 'INR',
      airline: cheapestFlightToArrival.airline,
      departureDate: newDate || null,
      flightSegments: cheapestFlightToArrival.flightSegments.map(segment => ({
        img: segment.img || null,
        departureTime: segment.departureTime,
        arrivalTime: segment.arrivalTime,
        flightNumber: segment.flightNumber.toString(),
      })),
    }).save();

    internationalFlightIds.push(flightToArrivalDetails._id);
  }
  console.log("cheapestFlightToArrival", cheapestFlightToArrival)
  console.log("internationalFlightIds", internationalFlightIds)

  // Update the internationalFlights field in the itinerary
  itinerary.internationalFlights = internationalFlightIds;

  return itinerary;
};



const deleteOldDetails = async (itinerary) => {
  const { itinerary: itineraryList } = itinerary;

  for (const city of itineraryList) {
    // Delete old flight details if they exist
    if (city.transport && city.transport.modeDetails && city.transport.mode === 'Flight') {
      await Flight.findByIdAndDelete(city.transport.modeDetails);
      city.transport.modeDetails = null; // Reset the field
    }

    // Delete old taxi details if they exist
    if (city.transport && city.transport.modeDetails && city.transport.mode === 'Taxi') {
      await Taxi.findByIdAndDelete(city.transport.modeDetails);
      city.transport.modeDetails = null; // Reset the field
    }

    // Delete old hotel details if they exist
    if (city.hotelDetails) {
      await Hotel.findByIdAndDelete(city.hotelDetails);
      city.hotelDetails = null; // Reset the field
    }
  }
};



export const deleteDaysFromCityService = async (itinerary, cityIndex, daysToDelete) => {
  if (!itinerary || !itinerary.enrichedItinerary || !itinerary.enrichedItinerary.itinerary) {
    throw new Error('Itinerary or enrichedItinerary is not properly defined.');
  }
  
  const cityItinerary = itinerary.enrichedItinerary.itinerary[cityIndex];

  // Ensure there are enough days to delete
  if (cityItinerary.days.length < daysToDelete-1) {
    throw new Error('Not enough days to delete');
  }

  // Remove the specified number of days from the end of the city's itinerary
  cityItinerary.days.splice(cityItinerary.days.length - daysToDelete, daysToDelete);
  cityItinerary.stayDays -= daysToDelete;

  // Recalculate the start date based on the first day of the itinerary
  const startDay = new Date(itinerary.enrichedItinerary.itinerary[0].days[0].date);
  // Use addDatesToItinerary to update the entire itinerary's dates
  const updatedItinerary=itinerary.enrichedItinerary;
  const finalItinerary = addDatesToItinerary(updatedItinerary, startDay);
 
  // Update and return the modified enrichedItinerary
  return { 
    enrichedItinerary: finalItinerary };
};
