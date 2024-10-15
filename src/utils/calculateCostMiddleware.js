import Flight from '../v1/models/flight.js';
import Hotel from '../v1/models/hotel.js';
import GptActivity from '../v1/models/gptactivity.js';
import Activity from '../v1/models/activity.js';
import Itinerary from '../v1/models/itinerary.js';
import Destination from '../v1/models/destination.js';
import Ferry from '../v1/models/ferry.js';
import Taxi from '../v1/models/taxi.js';
import Settings from '../v1/models/settings.js';

export const calculateTotalPriceMiddleware = async (req, res, next) => {
  try {
    const { itineraryId } = req.params;
    const itinerary = await Itinerary.findById(itineraryId);

    if (!itinerary) {
      return res.status(404).json({ message: 'Itinerary not found' });
    }

    const { adults, children } = itinerary;
    let totalPrice = 0;
    let price = 0;

    // Fetch settings to access markup values and service fee
    const settings = await Settings.findOne();
    if (!settings) {
      return res.status(404).json({ message: 'Settings not found' });
    }

    // Calculate transport prices
    for (const city of itinerary.enrichedItinerary.itinerary) {
      let transferPrice = 0;

      if (city.transport && city.transport.mode && city.transport.modeDetails) {
        const modeId = city.transport.modeDetails;
        const mode = city.transport.mode;
        let modeDetails = null;

        // Handling different transport modes with respective markups
        if (mode === 'Flight') {
          modeDetails = await Flight.findById(modeId);
          if (modeDetails && modeDetails.price) {
            transferPrice = parseFloat(modeDetails.price);
            price += transferPrice;
            // Apply flight markup
            transferPrice += transferPrice * (settings.flightMarkup / 100);
          }
        } else if (mode === 'Car') {
          modeDetails = await Taxi.findById(modeId);
          if (modeDetails && modeDetails.price) {
            transferPrice = parseFloat(modeDetails.price);
            price += transferPrice;
            // Apply taxi markup
            transferPrice += transferPrice * (settings.taxiMarkup / 100);
          }
        } else if (mode === 'Ferry') {
          modeDetails = await Ferry.findById(modeId);
          if (modeDetails && modeDetails.price) {
            transferPrice = parseFloat(modeDetails.price);
            price += transferPrice;
            // Apply ferry markup
            transferPrice += transferPrice * (settings.ferryMarkup / 100);
          }
        }
      }

      totalPrice += transferPrice;
    }

    // Calculate hotel prices for each city
    for (const city of itinerary.enrichedItinerary.itinerary) {
      if (city.hotelDetails) {
        const hotelDetails = await Hotel.findById(city.hotelDetails);
        if (hotelDetails && hotelDetails.price) {
          const hotelPricePerNight = parseFloat(hotelDetails.price);
          const stayDays = city.stayDays;

          // Calculate total hotel price for this city
          const totalHotelPrice = hotelPricePerNight * stayDays;
          price += totalHotelPrice;

          // Apply stay markup
          const totalPriceWithMarkup = totalHotelPrice + (totalHotelPrice * (settings.stayMarkup / 100));

          totalPrice += totalPriceWithMarkup; // Add to the overall total price
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
              price += totalActivityPrice;
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

    // Store current total price before tax and service fee
    const currentTotalPrice = totalPrice;

    // Calculate and add 18% tax
    const taxAmount = currentTotalPrice * 0.18; // 18% tax
    totalPrice += taxAmount;

    // Add service fee
    totalPrice += settings.serviceFee;

    // Store both current total price and final total price in the itinerary
    itinerary.currentTotalPrice = currentTotalPrice.toFixed(2);
    itinerary.totalPriceWithoutMarkup = price.toFixed(2);

    // Update the total price in the itinerary
    itinerary.totalPrice = totalPrice.toFixed(2);
    await itinerary.save();

    next();
  } catch (error) {
    console.error('Error calculating total price:', error);
    res.status(500).json({ message: 'Error calculating total price' });
  }
};

export const recalculateTotalPriceForItinerary = async (itinerary) => {
  try {
    const { adults, children } = itinerary;
    let totalPrice = 0;
    let price = 0;

    // Fetch settings to access markup values and service fee
    const settings = await Settings.findOne();
    if (!settings) {
      throw new Error('Settings not found');
    }

    // Calculate transport prices
    for (const city of itinerary.enrichedItinerary.itinerary) {
      let transferPrice = 0;

      if (city.transport && city.transport.mode && city.transport.modeDetails) {
        const modeId = city.transport.modeDetails;
        const mode = city.transport.mode;
        let modeDetails = null;

        // Handling different transport modes with respective markups
        if (mode === 'Flight') {
          modeDetails = await Flight.findById(modeId);
          if (modeDetails && modeDetails.price) {
            transferPrice = parseFloat(modeDetails.price);
            price += transferPrice;
            // Apply flight markup
            transferPrice += transferPrice * (settings.flightMarkup / 100);
          }
        } else if (mode === 'Car') {
          modeDetails = await Taxi.findById(modeId);
          if (modeDetails && modeDetails.price) {
            transferPrice = parseFloat(modeDetails.price);
            price += transferPrice;
            // Apply taxi markup
            transferPrice += transferPrice * (settings.taxiMarkup / 100);
          }
        } else if (mode === 'Ferry') {
          modeDetails = await Ferry.findById(modeId);
          if (modeDetails && modeDetails.price) {
            transferPrice = parseFloat(modeDetails.price);
            price += transferPrice;
            // Apply ferry markup
            transferPrice += transferPrice * (settings.ferryMarkup / 100);
          }
        }
      }

      totalPrice += transferPrice;
    }

    // Calculate hotel prices for each city
    for (const city of itinerary.enrichedItinerary.itinerary) {
      if (city.hotelDetails) {
        const hotelDetails = await Hotel.findById(city.hotelDetails);
        if (hotelDetails && hotelDetails.price) {
          const hotelPricePerNight = parseFloat(hotelDetails.price);
          const stayDays = city.stayDays;

          // Calculate total hotel price for this city
          const totalHotelPrice = hotelPricePerNight * stayDays;
          price += totalHotelPrice;

          // Apply stay markup
          const totalPriceWithMarkup = totalHotelPrice + (totalHotelPrice * (settings.stayMarkup / 100));

          totalPrice += totalPriceWithMarkup; // Add to the overall total price
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
              price += totalActivityPrice;
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

    // Store current total price before tax and service fee
    const currentTotalPrice = totalPrice;

    // Calculate and add 18% tax
    const taxAmount = currentTotalPrice * 0.18; // 18% tax
    totalPrice += taxAmount;

    // Add service fee
    totalPrice += settings.serviceFee;

    // Store both current total price and final total price in the itinerary
    itinerary.currentTotalPrice = currentTotalPrice.toFixed(2);
    itinerary.totalPriceWithoutMarkup = price.toFixed(2);

    // Update the total price in the itinerary
    itinerary.totalPrice = totalPrice.toFixed(2);
    return itinerary;
  } catch (error) {
    console.error('Error recalculating total price:', error);
    throw new Error('Error recalculating total price');
  }
};
