import cron from 'node-cron';
import Itinerary from '../models/itinerary.js';
import Flight from '../models/flight.js';
import Hotel from '../models/hotel.js';
import { refetchFlightAndHotelDetails } from '../services/itineraryService.js';
import logger from '../../config/logger.js';

// Function to refetch flight and hotel details and update itineraries
export const updateFlightAndHotelDetails = async () => {
  try {
    // Get all itineraries
    const itineraries = await Itinerary.find({});

    for (const itinerary of itineraries) {
      try {
        // Extract adults, children, and childrenAges from rooms array
        let adults = 0;
        let children = 0;
        let childrenAges = [];

        if (itinerary.rooms && Array.isArray(itinerary.rooms)) {
          itinerary.rooms.forEach((room) => {
            adults += room.adults || 0;
            children += room.children || 0;
            if (room.childrenAges && Array.isArray(room.childrenAges)) {
              childrenAges = childrenAges.concat(room.childrenAges);
            }
          });
        }

        // Prepare data needed to refetch details
        const requestData = {
          adults,
          children,
          childrenAges,
          rooms: itinerary.rooms,
        };

        // Delete old flight and hotel details from DB
        await deleteOldFlightAndHotelDetails(itinerary);

        // Refetch flight and hotel details for the itinerary
        const updatedItinerary = await refetchFlightAndHotelDetails(itinerary, requestData);

        // Update the itinerary in the database with the new details
        itinerary.enrichedItinerary = updatedItinerary;
        itinerary.adults = adults;
        itinerary.children = children;
        itinerary.childrenAges = childrenAges;
        itinerary.travellingWith = itinerary.travellingWith; // Ensure travellingWith is still preserved

        await itinerary.save();

        logger.info(`Itinerary ID ${itinerary._id} updated with new flight and hotel details`);
      } catch (error) {
        logger.error(`Error updating flight and hotel details for itinerary ID ${itinerary._id}:`, error);
      }
    }

    logger.info('All itineraries have been updated successfully with new flight and hotel details.');
  } catch (error) {
    logger.error('Error updating itinerary details and prices:', error);
  }
};

// Function to delete old flight and hotel details from the database
const deleteOldFlightAndHotelDetails = async (itinerary) => {
  const { itinerary: itineraryList } = itinerary.enrichedItinerary;

  for (const city of itineraryList) {
    try {
      // Delete old flight details if they exist
      if (city.transport && city.transport.modeDetails && city.transport.mode === 'Flight') {
        const oldFlightId = city.transport.modeDetails;
        await Flight.findByIdAndDelete(oldFlightId);
        logger.info(`Deleted old flight details with ID: ${oldFlightId} for city: ${city.currentCity}`);
      }

      // Delete old hotel details if they exist
      if (city.hotelDetails) {
        const oldHotelId = city.hotelDetails;
        await Hotel.findByIdAndDelete(oldHotelId);
        logger.info(`Deleted old hotel details with ID: ${oldHotelId} for city: ${city.currentCity}`);
      }
    } catch (error) {
      logger.error(`Error deleting old details for city ${city.currentCity}:`, error);
    }
  }
};

cron.schedule('0 0 * * *', () => {
  logger.info('Running scheduled task: Updating flight and hotel details for itineraries');
  updateFlightAndHotelDetails();
});