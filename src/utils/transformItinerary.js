import moment from 'moment';
export function settransformItinerary(itineraryData) {
    try {
    for (let cityIndex = 0; cityIndex < itineraryData.itinerary.length; cityIndex++) {
        const city = itineraryData.itinerary[cityIndex];
        const transportMode = city.transport;

        if (transportMode) {
            city.transport = {
                mode: transportMode,
                mode_details: null, // Will be filled later if mode is "Flight"
            };
            delete city.transfer_duration;
            delete city.transfer_cost_per_person_inr;
        }
    }
    return itineraryData;
} catch (error) {
    console.error('Error transforming itinerary :', error);
    return { error: 'Error transforming itinerary' };
  }
}