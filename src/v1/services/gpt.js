import OpenAI from 'openai';
import dotenv from 'dotenv';
import logger from '../../config/logger.js';
dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate a detailed itinerary based on the provided itinerary data
 * @param {Object} itineraryData - The input data including cities, activities, and transport details
 * @returns {Object} - The generated itinerary in JSON format
 */
export async function generateItinerary(itineraryData) {
    // Format the cities and activities for the prompt
    const cityActivityList = itineraryData.cities
        .map(city =>
            `${city.name}: ${city.activities.map(activity => `- ${activity.name} (${activity.duration})`).join(', ')}`
        )
        .join('\n');
    const messages = [
        {
            role: "system",
            content: `You are an expert travel planner tasked with creating an optimized itinerary for a ${itineraryData.travelling_with} traveling to ${itineraryData.country}. The input includes specific cities and activities. Your goal is to maximize enjoyment, minimize travel costs, and ensure efficient use of time. **The trip's duration can be adjusted to ensure all activities are included**.

  Key Requirements:

  1. **Reorder Cities**: Reorder the cities to optimize travel cost, time efficiency, and **distance**. Consider factors like proximity, travel costs, and minimizing travel time.
  2. **Reorder Activities**: Reorder activities within each city to minimize **distance between activity locations**. Ensure each day is fully utilized, and activities flow naturally from one to the next.
  3. **Day Utilization**: Each day should be fully utilized with activities, planned effectively with appropriate start and end times strictly between **10:00 AM and 10:00 PM**. If a day's activities cannot fit within this window, extend the trip duration or adjust the itinerary. **Must not have empty array of activities**. If necessary, redistribute activities across days to prevent any day from being empty.
  4. **Include Durations**: Retain the provided duration for each activity and ensure it is respected in the itinerary.
  5. **Transportation Details**: Include the method of transport between cities, the cost per person in INR, and the travel duration.
  6. **JSON Output**: Structure the output in JSON format with a title, subtitle, and details such as current city, next city, stay days, transport method, cost, and a day-by-day breakdown of activities.
  7. **Transport Methods**: Use only the following transport methods: Car, Ferry, and Flight.
  8. timeStamp can be morning, afternoon, evening, and night only.
  9. **Include all given cities.**
  10. **Days array should not be empty, all activities must be covered.**
  11. Assign activities timings (startTime and endTime) according to opens_at and closes_at time given in input.
  12. Activities endTime should not be after 11:59 PM and startTime should not be before 3:00 AM.

  Cities and Activities:

  ${cityActivityList}

  Output Format:

  {
    "title": "[Unique title]",
    "subtitle": "[Unique subtitle]",
    "itinerary": [
      {
        "currentCity": "City A",
        "nextCity": "City B",
        "stayDays": 2,
        "transport": "Car",
        "transferCostPerPersonINR": 2000,
        "transferDuration": "30 minutes",
        "days": [
          {
            "day": 1,
            "date": "2024-09-01",
            "activities": [
              {
                "name": "Activity A",
                "startTime": "10:00 AM",
                "endTime": "1:00 PM",
                "duration": "3 hours",
                "timeStamp": "Morning",
                "category": "sight-seeing"
              }
            ]
          },
          {
            "day": 2,
            "date": "2024-09-02",
            "activities": [
              {
                "name": "Activity B",
                "startTime": "2:00 PM",
                "endTime": "4:00 PM",
                "duration": "2 hours",
                "timeStamp": "Afternoon",
                "category": "Dining"
              }
            ]
          }
        ]
      }
    ]
  }

  Ensure each city is visited only once, and the last city's "nextCity" is set to null. The itinerary must be cost- and time-efficient, with each activity scheduled only once. Make sure activities are reordered to make the most of each day and enhance the travel experience. If the itinerary cannot fit all activities within the original duration, extend the trip duration as needed to include all activities.`,
        },
        {
            role: "user",
            content: `Create a detailed itinerary for a trip to ${itineraryData.country}, including all provided cities and their activities.

  The itinerary should:
  - **Reorder the cities to optimize for both travel cost and time efficiency.** Consider the overall flow and proximity of cities to each other to minimize travel time.
  - **Reorder activities within each city to maximize enjoyment and efficiency.** Consider the proximity of activities within the city, their opening hours, and any other factors that might affect the sequence.
  - Include the number of stay days in each city and ensure that the activities fit into these days. The trip duration can be extended if necessary to include all activities.
  - Specify the transportation method and cost per person in INR between each city.
  - Provide the duration of travel between cities.
  - Offer a day-by-day breakdown of activities in each city, ensuring no day is left empty. Activities should be scheduled to make full use of the stay days within the time frame of **10:00 AM to 10:00 PM**. No activities should be scheduled outside this time frame, and there should be no empty arrays of activities for any day.
  - Ensure that each activity is only included **once throughout the entire trip** and is not repeated.
  - **Ensure that the duration for each activity is respected and included in the itinerary.**
  - Use only the activities listed below for each city and do not include any new activities.
  - Use only the provided transport methods: Car, Ferry, and Flight.
  - timeStamp can be morning, afternoon, evening, and night only.
  - **Include all given cities.**
  - **Days array should not be empty, all activities must be covered.**
  - Assign activities timings (startTime and endTime) according to opens_at and closes_at time given in input.
  - Activities endTime should not be after 11:59 PM and startTime should not be before 3:00 AM.

  ${cityActivityList}

  Output the result in JSON format with the following structure:

  {
    "title": "[Unique title]",
    "subtitle": "[Unique subtitle]",
    "itinerary": [
      {
        "currentCity": "City A",
        "nextCity": "City B",
        "stayDays": 2,
        "transport": "Car",
        "transferCostPerPersonINR": 2000,
        "transferDuration": "30 minutes",
        "days": [
          {
            "day": 1,
            "date": "2024-09-01",
            "activities": [
              {
                "name": "Activity A",
                "startTime": "10:00 AM",
                "endTime": "1:00 PM",
                "duration": "3 hours",
                "timeStamp": "Morning",
                "category": "sight-seeing"
              }
            ]
          },
          {
            "day": 2,
            "date": "2024-09-02",
            "activities": [
              {
                "name": "Activity B",
                "startTime": "2:00 PM",
                "endTime": "4:00 PM",
                "duration": "2 hours",
                "timeStamp": "Afternoon",
                "category": "Dining"
              }
            ]
          }
        ]
      }
    ]
  }

  Ensure that each city is visited only once, the route is optimized based on travel cost and time, and all days are utilized with scheduled activities. The last city in the itinerary should have "nextCity" set to null, and its "transport", "transferCostPerPersonINR", and "transferDuration" should also be set to null. Extend the trip duration if needed to include all activities.`,
        },
    ];

    try {
      const response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: messages,
          temperature: 0.2,
          top_p: 0.8,
      });

      const rawResponse = response.choices[0].message.content;

      // Ensure the response is in JSON format
      let parsedResponse;
      try {
          parsedResponse = JSON.parse(rawResponse);
      } catch (error) {
          logger.error("Failed to parse response:", error);
          throw new Error("Failed to parse response from OpenAI.");
      }

      // Validate the parsed response
      if (!parsedResponse.title || !parsedResponse.subtitle || !parsedResponse.itinerary) {
          throw new Error("Response is missing required fields.");
      }

      // Reintroduce the filtering logic
      const validCityNames = new Set(itineraryData.cities.map(city => city.name));
      const validActivityNames = new Set(
          itineraryData.cities.flatMap(city => city.activities.map(activity => activity.name))
      );

      // Remove any extra cities not in the original input
      parsedResponse.itinerary = parsedResponse.itinerary.filter(leg => validCityNames.has(leg.currentCity));

      parsedResponse.itinerary.forEach(leg => {
          // Remove activities not in the original input
          leg.days = leg.days
              .map(day => {
                  day.activities = day.activities.filter(activity => validActivityNames.has(activity.name));
                  return day;
              })
              .filter(day => day.activities.length > 0);
          
          // Ensure all activities are covered in the itinerary
          const remainingActivities = itineraryData.cities
              .find(city => city.name === leg.currentCity)
              .activities.filter(activity => !leg.days.some(day =>
                  day.activities.some(a => a.name === activity.name)
              ));
          
          // Add the remaining activities to the last day or create new days as needed
          remainingActivities.forEach(activity => {
                  
                  leg.days.push({
                      day: leg.days.length + 1,
                      date: `2024-09-${leg.days.length + 1}`,
                      activities: [
                        {
                            ...activity,
                            startTime: '10:00 AM',
                            endTime: '4:00 PM',
                            timeStamp: 'Morning',
                            category: activity.category,
                        },
                    ],

                  });
              
          });
      });

      return parsedResponse;

  } catch (error) {
      logger.error("Error generating itinerary:", error);
      throw new Error("Failed to generate itinerary.");
  }
}