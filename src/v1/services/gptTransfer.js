import OpenAI from 'openai';
import dotenv from 'dotenv';
import logger from '../../config/logger.js';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate transport mode details between cities
 * @param {Object} travelData - The input data including departure city, arrival city, distance, and user preferences
 * @returns {Object} - The generated mode of transport in JSON format
 */
export async function generateTransportDetails(travelData) {
    const { departureCity, arrivalCity } = travelData;

    // Construct the prompt for selecting transport mode
    const messages = [
        {
            role: "system",
            content: `You are an expert travel planner responsible for choosing the most efficient and enjoyable method of transport between two cities. Consider minimizing travel cost, travel time, and maximizing convenience. The available transport methods are Car, Ferry, and Flight.
            Use the following guidelines for selection:
            - **Car**: Suitable for distances less than 300 km or where no ferry/flight option exists.
            - **Ferry**: Use if both cities have ports or ferry services available, regardless of distance.
            - **Flight**: Suitable for distances greater than 300 km or if the time savings is significant.
            - You must return only one mode for each pair of cities.`,
        },
        {
            role: "user",
            content: `Choose the best mode of transport between ${departureCity} and ${arrivalCity}. Only choose from Car, Ferry, or Flight, and return a response in JSON format as:
            {
              "mode": "Car" // or Ferry or Flight
            }`,
        }
    ];

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: messages,
            temperature: 0.3,
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
        if (!parsedResponse.mode || !['Car', 'Ferry', 'Flight'].includes(parsedResponse.mode)) {
            throw new Error("Invalid transport mode returned from OpenAI.");
        }

        return parsedResponse;

    } catch (error) {
        logger.error("Error generating transport mode:", error);
        throw new Error("Failed to generate transport mode.");
    }
}
