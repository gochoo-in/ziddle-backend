// Helper function to add new days to the city in the itinerary
export const addNewDaysToCity = (itinerary, cityIndex, additionalDays, leisureActivityId) => {
    const city = itinerary.itinerary[cityIndex];
  
    // Find the last day of the current city stay
    const lastDay = city.days[city.days.length - 1];
    const lastDate = new Date(lastDay.date);
  
    // Loop to add the specified number of new days
    for (let i = 1; i <= additionalDays; i++) {
      const newDay = {
        day: lastDay.day + i,
        date: new Date(lastDate.getTime() + i * 24 * 60 * 60 * 1000).toISOString(), // Calculate new day date
        activities: [leisureActivityId], // Assign leisure activity to the new day
      };
  
      // Add the new day to the city's days array
      city.days.push(newDay);
    }
  
    return itinerary;
  };
  