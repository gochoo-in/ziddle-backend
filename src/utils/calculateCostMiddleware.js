import Flight from '../v1/models/flight.js';
import Hotel from '../v1/models/hotel.js';
import GptActivity from '../v1/models/gptactivity.js';
import Activity from '../v1/models/activity.js';
import Itinerary from '../v1/models/itinerary.js';
import Destination from '../v1/models/destination.js';

export const calculateTotalPriceMiddleware = async (req, res, next) => {
  try {
    const { itineraryId } = req.params;
    const itinerary = await Itinerary.findById(itineraryId);

    if (!itinerary) {
      return res.status(404).json({ message: 'Itinerary not found' });
    }

    const { adults, children } = itinerary;
    let totalPrice = 0;

    // Calculate transport prices
    for (const city of itinerary.enrichedItinerary.itinerary) {
      let transferPrice = 0;

      if (city.transport && city.transport.mode && city.transport.modeDetails) {
        const modeId = city.transport.modeDetails;
        const mode = city.transport.mode;
        let modeDetails = null;

        if (mode === 'Flight') {
          modeDetails = await Flight.findById(modeId);
        } else if (mode === 'Taxi') {
          modeDetails = await Taxi.findById(modeId);
        } else if (mode === 'Ferry') {
          modeDetails = await Ferry.findById(modeId);
        }

        if (modeDetails && modeDetails.price) {
          transferPrice = typeof modeDetails.price === 'string'
            ? parseFloat(modeDetails.price)
            : modeDetails.price;

          if (mode === 'Flight') {
            transferPrice += transferPrice * 0.15; // Add a 15% surcharge for flights
          }
        }
      }

      totalPrice += transferPrice;
    }

    // Calculate hotel prices
    for (const city of itinerary.enrichedItinerary.itinerary) {
      if (city.hotelDetails) {
        const hotelDetails = await Hotel.findById(city.hotelDetails);
        if (hotelDetails && hotelDetails.price) {
          const hotelPrice = parseFloat(hotelDetails.price) * city.stayDays;
          totalPrice += hotelPrice;
        }
      }
    }

    // Calculate activity prices
    for (const city of itinerary.enrichedItinerary.itinerary) {
      for (const day of city.days) {
        for (const activityId of day.activities) {
          const gptActivity = await GptActivity.findById(activityId);
          if (gptActivity) {
            const originalActivity = await Activity.findOne({ name: gptActivity.name });
            if (originalActivity && originalActivity.price) {
              const activityPricePerPerson = parseFloat(originalActivity.price);
              const totalActivityPrice = activityPricePerPerson * (adults + children);
              totalPrice += totalActivityPrice;
            }
          }
        }
      }
    }

    // Apply destination markup
    const destination = await Destination.findOne({ name: itinerary.enrichedItinerary.destination });
    if (destination && destination.markup) {
      totalPrice += totalPrice * (destination.markup / 100);
    }

    // Update the total price in the itinerary
    itinerary.totalPrice = totalPrice.toFixed(2);
    await itinerary.save();

    next();
  } catch (error) {
    console.error('Error calculating total price:', error);
    res.status(500).json({ message: 'Error calculating total price' });
  }
};
