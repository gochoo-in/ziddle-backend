import moment from 'moment';
import logger from '../config/logger.js';
import Ferry from '../v1/models/ferry.js'; // Assuming you have a Ferry model
import httpFormatter from '../utils/formatter.js';

async function generateDummyFerryDetails() {
    // Generate dummy ferry details
    return {
        transferId: 'dummyFerryId123',
        pickupLocation: 'Port A',
        dropoffLocation: 'Port B',
        departureTime: moment().format('YYYY-MM-DDTHH:mm:ss'),
        duration: 120, // In minutes
        arrivalTime: moment().add(120, 'minutes').format('YYYY-MM-DDTHH:mm:ss'),
        vehicleType: 'Ferry',
        passengerCount: 100,
        luggageAllowed: 50,
        price: '500', // INR
        currency: 'INR',
        sharedTransfer: true
    };
}

export async function addFerryDetailsToItinerary(data) {
    try {
        const { itinerary } = data;

        for (let i = 0; i < itinerary.length - 1; i++) {
            const currentCity = itinerary[i].currentCity;
            const nextCity = itinerary[i + 1].currentCity;

            if (itinerary[i].transport && itinerary[i].transport.mode === 'Ferry') {
                try {
                    const dummyFerry = await generateDummyFerryDetails();

                    // Create a new Ferry instance (you can store it in your database if needed)
                    const newFerry = new Ferry({
                        ...dummyFerry,
                    });

                    const savedFerry = await newFerry.save();

                    itinerary[i].transport.modeDetails = savedFerry._id;
                } catch (innerError) {
                    logger.error(`Error processing ferry details for leg ${i}:`, { error: innerError.message });
                    itinerary[i].transport.modeDetails = null;
                }
            }
        }

        return {
            ...data,
            itinerary
        };
    } catch (error) {
        logger.error("Error adding ferry details to itinerary:", { error: error.message });
        return httpFormatter(null, 'Error adding ferry details to itinerary', false);
    }
}
