import moment from 'moment';
import logger from '../config/logger.js';
export function settransformItinerary(itineraryData) {
    try {
        for (let cityIndex = 0; cityIndex < itineraryData.itinerary.length; cityIndex++) {
            const city = itineraryData.itinerary[cityIndex];
            const transportMode = city.transport;

            if (transportMode) {
                city.transport = {
                    mode: transportMode,
                    modeDetails: null, // Will be filled later if mode is "Flight"
                };
                delete city.transfer_duration;
                delete city.transfer_cost_per_person_inr;
            }
            console.log("ramu",city.days);
            // Adjust activities within each city for a 1-hour gap and ensure chronological order
            city.days.forEach(day => {
                console.log(day.activities)
                // Sort activities by startTime in 12-hour format
                day.activities.sort((a, b) => moment(a.startTime, 'hh:mm A') - moment(b.startTime, 'hh:mm A'));
            
                let previousEndTime = null;
                // console.log("dataaa",parseFloat(activity.duration.split(' ')[0]))
                day.activities.forEach(activity => {
                    console.log("raja",activity)
                    const durationHours = parseFloat(activity.duration.split(' ')[0]);
                    const startTime = moment(activity.startTime, 'hh:mm A');
            
                    if (previousEndTime) {
                        const requiredStartTime = previousEndTime.clone().add(1, 'hours');
            
                        if (startTime.isBefore(requiredStartTime)) {
                            activity.startTime = requiredStartTime.format('hh:mm A');
                            const newEndTime = requiredStartTime.clone().add(durationHours, 'hours');
                            activity.endTime = newEndTime.format('hh:mm A');
                        } else {
                            const newEndTime = startTime.clone().add(durationHours, 'hours');
                            activity.endTime = newEndTime.format('hh:mm A');
                        }
            
                        previousEndTime = moment(activity.endTime, 'hh:mm A');
                    } else {
                        const newEndTime = startTime.clone().add(durationHours, 'hours');
                        activity.endTime = newEndTime.format('hh:mm A');
                        previousEndTime = newEndTime;
                    }
                });
            });
        }
        return itineraryData;
    } catch (error) {
        logger.error('Error transforming itinerary:', error);
        return { error: 'Error transforming itinerary' };
    }
}
