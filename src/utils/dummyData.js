import moment from 'moment';
import logger from '../config/logger.js';
import Ferry from '../v1/models/ferry.js'; // Assuming you have a Ferry model
import httpFormatter from '../utils/formatter.js';

async function generateDynamicFerryDetails(currentCity, nextCity, transferDuration, date) {
    // Use the currentCity, nextCity, transferDuration, and date to generate ferry details dynamically
    return {
        transferId: `ferry_${currentCity}_${nextCity}`, // Unique transferId based on city names
        pickupLocation: `${currentCity} Port`,  // Use the current city name
        dropoffLocation: `${nextCity} Port`,  // Use the next city name
        departureTime: moment(date).format('YYYY-MM-DDTHH:mm:ss'),
        duration: transferDuration || 90,  // Use the transferDuration from the itinerary
        arrivalTime: moment(date).add(transferDuration || 90, 'minutes').format('YYYY-MM-DDTHH:mm:ss'),
        vehicleType: 'Ferry',
        passengerCount: 100,
        luggageAllowed: 50,
        price: '500', 
        currency: 'INR',
        sharedTransfer: true
    };
}


export async function addFerryDetailsToItinerary(data, currencyCode = 'INR') {
    try {
        const { itinerary } = data;

        for (let i = 0; i < itinerary.length - 1; i++) {
            const currentCity = itinerary[i].currentCity;
            const nextCity = itinerary[i + 1].currentCity;
            const transferDuration = itinerary[i].transferDuration;
            const lastDay = itinerary[i].days[itinerary[i].days.length - 1];
            const nextDay = moment(lastDay.date).add(1, 'days').format('YYYY-MM-DD');

            // Check if the transport mode is 'Ferry'
            if (itinerary[i].transport && itinerary[i].transport.mode === 'Ferry') {
                try {
                    // Generate ferry details dynamically using city names, duration, and dates
                    const dynamicFerry = await generateDynamicFerryDetails(currentCity, nextCity, transferDuration, nextDay);

                    // Create and save ferry details in the database
                    const newFerry = new Ferry({
                        ...dynamicFerry,
                    });

                    const savedFerry = await newFerry.save();

                    // Assign the ferry details to modeDetails in the itinerary
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

