import Agenda from 'agenda';
import Itinerary from '../models/itinerary.js';
import Flight from '../models/flight.js';
import Hotel from '../models/hotel.js';
import { refetchFlightAndHotelDetails } from '../services/itineraryService.js';
import logger from '../../config/logger.js';
import { recalculateTotalPriceForItinerary } from '../../utils/calculateCostMiddleware.js';
import dotenv from 'dotenv';

dotenv.config();

const mongoUri = process.env.MONGO_URI; 
const agendaCollection = process.env.AGENDA_COLLECTION || 'agendaJobs'; 
const processInterval = process.env.AGENDA_POLL_INTERVAL || '30 seconds'; 
const maxPoolSize = parseInt(process.env.AGENA_MAX_POOL_SIZE, 10) || 50; 
const minPoolSize = parseInt(process.env.AGENA_MIN_POOL_SIZE, 10) || 10; 

const agenda = new Agenda({
  db: { 
    address: mongoUri,
    collection: agendaCollection,
    options: {
      maxPoolSize: maxPoolSize, 
      minPoolSize: minPoolSize   
    }
  },
  processEvery: processInterval 
});

agenda.maxConcurrency(50);  

/**
 * Job to update flight and hotel details for itineraries created or updated
 * within the last 10 days.
 */
agenda.define('update flight and hotel details', { concurrency: 10, lockLifetime: 60000 }, async (job) => {
  try {
    logger.info('Job started: Updating flight and hotel details.');
    
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    const limit = 100;
    let skip = 0;

    while (true) {
      const itineraries = await Itinerary.find({
        $or: [
          { updatedAt: { $gte: tenDaysAgo } },
          { createdAt: { $gte: tenDaysAgo } }
        ]
      }).skip(skip).limit(limit).lean(); 

      if (itineraries.length === 0) break;

      for (const itinerary of itineraries) {
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

        const requestData = { adults, children, childrenAges, rooms: itinerary.rooms };

        await deleteOldFlightAndHotelDetails(itinerary);

        const updatedItinerary = await refetchFlightAndHotelDetails(itinerary, requestData);

        // Update itinerary details and recalculate total price
        itinerary.enrichedItinerary = updatedItinerary;
        itinerary.adults = adults;
        itinerary.children = children;
        itinerary.childrenAges = childrenAges;

        // Recalculate total price after updating itinerary
        await recalculateTotalPriceForItinerary(itinerary);

        // Save the updated itinerary
        await Itinerary.updateOne({ _id: itinerary._id }, itinerary);
        logger.info(`Itinerary ID ${itinerary._id} updated with new flight and hotel details`);
      }

      skip += limit; 
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
  const itineraryList = itinerary.enrichedItinerary.itinerary; 

  for (const city of itineraryList) {
    try {
      if (city.transport && city.transport.modeDetails && city.transport.mode === 'Flight') {
        const oldFlightId = city.transport.modeDetails;
        await Flight.findByIdAndDelete(oldFlightId);
        logger.info(`Deleted old flight details with ID: ${oldFlightId} for city: ${city.currentCity}`);
      }

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
 * The job will run every 24 hours.
 */
export const startItineraryUpdateJob = async () => {
  await agenda.start();
  await agenda.every('0 0 * * *', 'update flight and hotel details');
  logger.info("Job scheduled to run every 24 hours.");
};

// Gracefully shut down Agenda when the app exits
process.on('SIGTERM', () => {
  agenda.stop(() => {
    logger.info('Agenda stopped gracefully.');
    process.exit(0);
  });
});

export { agenda };
