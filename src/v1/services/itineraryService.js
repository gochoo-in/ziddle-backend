import City from '../models/city.js';
import { addNewDaysToCity } from '../../utils/itineraryUtils.js';
import { createLeisureActivityIfNotExist } from '../../utils/activityUtils.js';
import { addDatesToItinerary } from '../../utils/dateUtils.js';
import { addFlightDetailsToItinerary } from '../services/flightdetails.js';
import { addHotelDetailsToItinerary } from '../services/hotelDetails.js';
import { addTaxiDetailsToItinerary } from '../services/taxiDetails.js';
import {addFerryDetailsToItinerary} from '../../utils/dummyData.js'
import Flight from '../models/flight.js'
import Taxi from '../models/taxi.js'
import Hotel from '../models/hotel.js'
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
  const itineraryWithHotels = await addHotelDetailsToItinerary(itineraryWithFerry, adults, childrenAges, rooms);

  return itineraryWithHotels;
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
