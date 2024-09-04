
import moment from 'moment'; // Ensure you have moment.js installed

// Function to add dates to the itinerary and calculate total days and nights
export function addDatesToItinerary(data, startDate) {
    try {
        const { itinerary } = data;

        const start = moment(startDate);
        let currentDate = start;

        let totalDays = 0;  // Initialize total days counter
        let totalNights = 0; // Initialize total nights counter

        // Iterate over each leg of the itinerary
        itinerary.forEach((leg, index) => {
            if (leg.days) {
                const days = leg.days;
                const dayKeys = Object.keys(days);
                const numberOfDays = dayKeys.length;

                // Add dates to each day in the leg
                dayKeys.forEach(dayKey => {
                    days[dayKey].date = currentDate.format('YYYY-MM-DD');
                    currentDate = currentDate.add(1, 'days');
                });

                // Update totals
                totalDays += numberOfDays;

            }

            // Set the next city
            if (index < itinerary.length - 1) {
                leg.nextCity = itinerary[index + 1].currentCity;
            } else {
                leg.nextCity = null;
            }
            totalNights = totalDays - 1;
        });

        // Add total days and nights to the data
        return {
            ...data,
            itinerary,
            totalDays,
            totalNights
        };
    } catch (error) {
        console.error('Error adding dates to itinerary:', error);
        return { error: 'Error adding dates to itinerary' };
    }
}
