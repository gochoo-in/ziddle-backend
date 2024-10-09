import Agenda from 'agenda';
import Itinerary from '../models/itinerary.js';
import Flight from '../models/flight.js';
import Hotel from '../models/hotel.js';
import { refetchFlightAndHotelDetails } from '../services/itineraryService.js';
import logger from '../../config/logger.js';
import { recalculateTotalPriceForItinerary } from '../../utils/calculateCostMiddleware.js';

// Initialize Agenda with MongoDB connection
const agenda = new Agenda({ db: { address: 'mongodb://127.0.0.1/agenda' } });

/**
 * Job to update flight and hotel details for itineraries that were created or updated
 * within the last 10 days.
 */
agenda.define('update flight and hotel details', async (job) => {
  try {
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    // Fetch itineraries created or updated in the last 10 days
    const itineraries = await Itinerary.find({
      $or: [
        { updatedAt: { $gte: tenDaysAgo } },
        { createdAt: { $gte: tenDaysAgo } },
      ],
    });

    // Iterate over each itinerary and update flight and hotel details
    for (const itinerary of itineraries) {
      let adults = 0;
      let children = 0;
      let childrenAges = [];

      // Calculate number of adults, children, and their ages
      if (itinerary.rooms && Array.isArray(itinerary.rooms)) {
        itinerary.rooms.forEach((room) => {
          adults += room.adults || 0;
          children += room.children || 0;
          if (room.childrenAges && Array.isArray(room.childrenAges)) {
            childrenAges = childrenAges.concat(room.childrenAges);
          }
        });
      }

      const requestData = {
        adults,
        children,
        childrenAges,
        rooms: itinerary.rooms,
      };

      // Delete old flight and hotel details
      await deleteOldFlightAndHotelDetails(itinerary);

      // Refetch flight and hotel details
      const updatedItinerary = await refetchFlightAndHotelDetails(itinerary, requestData);

      // Update itinerary details
      itinerary.enrichedItinerary = updatedItinerary;
      itinerary.adults = adults;
      itinerary.children = children;
      itinerary.childrenAges = childrenAges;
      itinerary.travellingWith = itinerary.travellingWith;

      // Recalculate the total price of the itinerary
      await recalculateTotalPriceForItinerary(itinerary);

      // Save the updated itinerary
      await itinerary.save();

      logger.info(`Itinerary ID ${itinerary._id} updated with new flight and hotel details`);
    }

    logger.info('Itinerary update job completed.');
  } catch (error) {
    logger.error('Error updating flight and hotel details:', error);
  }
});

/**
 * Function to delete old flight and hotel details from the database
 * before refetching new details.
 */
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

/**
 * Function to start the Agenda job scheduler.
 * The job will run every day at midnight (00:00).
 */
export const startItineraryUpdateJob = async () => {
  await agenda.start();
  // Schedule the job to run every day at midnight using cron expression
  await agenda.every('0 0 * * *', 'update flight and hotel details');
};

// Gracefully shut down Agenda when the app exits
process.on('SIGTERM', () => {
  agenda.stop(() => process.exit(0));
});

export { agenda };
