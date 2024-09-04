export const addTransferActivity = (data) => {
    const { itinerary } = data;
    const updatedItinerary = [];
    
    for (let i = 0; i < itinerary.length; i++) {
        const citySegment = itinerary[i];
        const nextCitySegment = itinerary[i + 1];
        if(i==0) updatedItinerary.push(citySegment);
        if (nextCitySegment) {
            // Prepare transfer activity for the next city
            const transferActivity = {
                name: `Travel from ${citySegment.currentCity} to ${nextCitySegment.currentCity}`,
                startTime: "00:00",
                endTime: "23:59",
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
                        date: nextCitySegment.days[0].date,
                        activities: [transferActivity]
                    },
                    ...nextCitySegment.days.map((day, index) => ({
                        ...day,
                        day: index + 2
                    }))
                ]
            });
        } else {
            
        }
        // console.log("here");
    }
    return {...data,
        itinerary:updatedItinerary
    }
};