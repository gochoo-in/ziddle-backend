export const addTransferActivity = (data) => {
    const { itinerary } = data;

    if (!itinerary || !Array.isArray(itinerary)) {
        throw new Error('Invalid itinerary format: itinerary should be an array.');
    }

    const updatedItinerary = [];

    for (let i = 0; i < itinerary.length; i++) {
        const citySegment = itinerary[i];
        const nextCitySegment = itinerary[i + 1];

        if (i === 0) {
            // Add arrival activity for the first city
            const arrivalActivity = {
                name: `Arrival in ${citySegment.currentCity}`,
                startTime: "10:00 AM",
                endTime: "11:00 AM",
                duration: "1 hour",
                timeStamp: "All day",
                category: "Arrival",
                transport: citySegment.transport,
                arrivalCostPerPersonINR: citySegment.arrivalCostPerPersonINR || 0
            };

            updatedItinerary.push({
                ...citySegment,
                days: [
                    {
                        day: 1,
                        date: "",
                        activities: [arrivalActivity]
                    },
                    ...citySegment.days.map((day, index) => ({
                        ...day,
                        day: index + 2
                    }))
                ]
            });
        }

        if (nextCitySegment) {
            // Prepare transfer activity for the next city
            const transferActivity = {
                name: `Travel from ${citySegment.currentCity} to ${nextCitySegment.currentCity}`,
                startTime: "12:00 PM",
                endTime: "4:00 PM",
                duration: citySegment.transferDuration,
                timeStamp: "All day",
                category: "Travel",
                transport: citySegment.transport,
                transferCostPerPersonINR: citySegment.transferCostPerPersonINR
            };

            updatedItinerary.push({
                ...nextCitySegment,
                days: [
                    {
                        day: 1,
                        date: "",
                        activities: [transferActivity]
                    },
                    ...nextCitySegment.days.map((day, index) => ({
                        ...day,
                        day: index + 2
                    }))
                ]
            });
        }
    }

    return {
        ...data,
        itinerary: updatedItinerary
    };
};
