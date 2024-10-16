import Flight from '../v1/models/flight.js';
import Hotel from '../v1/models/hotel.js';
import GptActivity from '../v1/models/gptactivity.js';
import Activity from '../v1/models/activity.js';
import Itinerary from '../v1/models/itinerary.js';
import Destination from '../v1/models/destination.js';
import Ferry from '../v1/models/ferry.js';
import Taxi from '../v1/models/taxi.js';
import Settings from '../v1/models/settings.js';
import Discount from '../v1/models/discount.js';
import { applyDiscountFunction } from '../v1/modules/discount/discount.controller.js';
import logger from '../config/logger.js';

export const calculateTotalPriceMiddleware = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { itineraryId } = req.params;
    const itinerary = await Itinerary.findById(itineraryId);
    const destinationName = itinerary.enrichedItinerary.destination;
    const country = await Destination.findOne({ name: destinationName });
    const destId = country._id;
    const countryId = destId.toString();

    const discount = await Discount.findOne({
      destination: countryId,
      discountType: 'couponless' 
    }).sort({ createdAt: -1 });
    
    if (!itinerary) {
      return res.status(404).json({ message: 'Itinerary not found' });
    }

    const { adults, children } = itinerary;
    let totalPrice = 0;
    let priceWithoutCoupon = 0;
    let price = 0;

    // Fetch settings to access markup values and service fee
    const settings = await Settings.findOne();
    if (!settings) {
      return res.status(404).json({ message: 'Settings not found' });
    }

    // Calculate transport prices
    for (const city of itinerary.enrichedItinerary.itinerary) {
      let transferPrice = 0;
      let transferPriceWithoutCoupon = 0;

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
            transferPrice += transferPrice * (settings.flightMarkup / 100);
            transferPriceWithoutCoupon = transferPrice;

            // Apply flight markup
            
            if(discount.discountType === 'couponless' && discount.applicableOn.flights===true)
              {
                let response = await applyDiscountFunction({
                  discountId: discount._id,
                  userId: userId,
                  totalAmount: transferPrice
                });
                transferPrice -= response
              }
            
          }
        } if (mode === 'Car') {
          modeDetails = await Taxi.findById(modeId);
          if (modeDetails && modeDetails.price) {
            transferPrice = parseFloat(modeDetails.price);
            price += transferPrice;
            // Apply taxi markup
            transferPrice += transferPrice * (settings.taxiMarkup / 100);
            transferPriceWithoutCoupon = transferPrice
          }
        } if (mode === 'Ferry') {
          modeDetails = await Ferry.findById(modeId);
          if (modeDetails && modeDetails.price) {
            transferPrice = parseFloat(modeDetails.price);
            price += transferPrice;

            // Apply ferry markup
            transferPrice += transferPrice * (settings.ferryMarkup / 100);
            transferPriceWithoutCoupon = transferPrice
          }
        }
      }

      totalPrice += transferPrice;
      priceWithoutCoupon += transferPriceWithoutCoupon;
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
          priceWithoutCoupon += totalHotelPrice + (totalHotelPrice * (settings.stayMarkup / 100));
          price += totalHotelPrice;

          // Apply stay markup
          
          if(discount.discountType === 'couponless' && discount.applicableOn.hotels===true)
            {
              let response = await applyDiscountFunction({
                discountId: discount._id,
                userId: userId,
                totalAmount: totalHotelPrice
              });
              totalHotelPrice -= response
            }
          totalPrice += totalHotelPrice + (totalHotelPrice * (settings.stayMarkup / 100));; // Add to the overall total price
        }
      }
    }

    // Calculate activity prices
    const activityPricesPromises = itinerary.enrichedItinerary.itinerary.flatMap(city =>
      city.days.flatMap(day =>
        day.activities.map(async (activityId) => {
          const gptActivity = await GptActivity.findById(activityId);
          if (gptActivity) {
            const originalActivity = await Activity.findOne({ name: gptActivity.name });
            if (originalActivity && originalActivity.price) {
              const activityPricePerPerson = parseFloat(originalActivity.price);
              let totalActivityPrice = activityPricePerPerson * (adults + children); 
              
              // Apply discount logic if applicable
              if (discount.discountType === 'couponless' && discount.applicableOn.activities) {
                const response = await applyDiscountFunction({
                  discountId: discount._id,
                  userId: userId,
                  totalAmount: totalActivityPrice
                });
                totalActivityPrice -= response;
              }
    
              return isNaN(totalActivityPrice) ? 0 : totalActivityPrice;
            } else {
              logger.info(`No price found for activity with ID ${activityId} in city ${city.currentCity}`);
              return 0;
            }
          }
          return 0;
        })
      )
    );

    const activityPricesPromisesWithoutCoupon = itinerary.enrichedItinerary.itinerary.flatMap(city =>
      city.days.flatMap(day =>
        day.activities.map(async (activityId) => {
          const gptActivity = await GptActivity.findById(activityId);
          if (gptActivity) {
            const originalActivity = await Activity.findOne({ name: gptActivity.name });
            if (originalActivity && originalActivity.price) {
              const activityPricePerPerson = parseFloat(originalActivity.price);
              const totalActivityPrice = activityPricePerPerson * (adults + children); 
              return isNaN(totalActivityPrice) ? 0 : totalActivityPrice;
            } else {
              logger.info(`No price found for activity with ID ${activityId} in city ${city.currentCity}`);
              return 0; // Ensuring we return 0 instead of not returning anything
            }
          }
          return 0; // Ensuring we return 0 in case of missing gptActivity
        })
      )
    );
    const activityPrices = await Promise.all(activityPricesPromises);
    const activityPricesWithoutCoupon = await Promise.all(activityPricesPromisesWithoutCoupon);

    totalPrice += activityPrices.reduce((acc, price) => acc + price, 0);
    priceWithoutCoupon += activityPricesWithoutCoupon.reduce((acc, price) => acc + price, 0);
    // Apply destination markup
    const destination = await Destination.findOne({ name: itinerary.enrichedItinerary.destination });
    if (destination && destination.markup) {
      totalPrice += totalPrice * (destination.markup / 100);
      priceWithoutCoupon += priceWithoutCoupon * (destination.markup / 100);
    }

    if(discount.discountType === 'couponless' && discount.applicableOn.package===true)
      {
        let response = await applyDiscountFunction({
          discountId: discount._id,
          userId: userId,
          totalAmount: totalPrice
        });
        totalPrice -= response
      }
    // Store current total price before tax and service fee
    let currentTotalPrice = priceWithoutCoupon;
    const disc = currentTotalPrice - totalPrice;
    // Calculate and add 18% tax
    const taxAmount = currentTotalPrice * 0.18; // 18% tax
    
    currentTotalPrice += taxAmount;

    // Add service fee
    currentTotalPrice += settings.serviceFee;
    currentTotalPrice -=disc;

    // Store both current total price and final total price in the itinerary
    itinerary.currentTotalPrice = currentTotalPrice.toFixed(2);
    itinerary.totalPriceWithoutMarkup = price.toFixed(2);

    // Update the total price in the itinerary
    itinerary.totalPrice = totalPrice.toFixed(2);
    itinerary.couponlessDiscount = disc.toFixed(2)
    await itinerary.save();

    next();
  } catch (error) {
    console.error('Error calculating total price:', error);
    res.status(500).json({ message: 'Error calculating total price' });
  }
};

export const recalculateTotalPriceForItinerary = async (itinerary) => {
  try {
    const userId = req.user.userId;
    const { itineraryId } = req.params;
    const itinerary = await Itinerary.findById(itineraryId);
    const destinationName = itinerary.enrichedItinerary.destination;
    const country = await Destination.findOne({ name: destinationName });
    const destId = country._id;
    const countryId = destId.toString();

    const discount = await Discount.findOne({
      destination: countryId,
      discountType: 'couponless' 
    }).sort({ createdAt: -1 });
    
    if (!itinerary) {
      return res.status(404).json({ message: 'Itinerary not found' });
    }

    const { adults, children } = itinerary;
    let totalPrice = 0;
    let priceWithoutCoupon = 0;
    let price = 0;

    // Fetch settings to access markup values and service fee
    const settings = await Settings.findOne();
    if (!settings) {
      return res.status(404).json({ message: 'Settings not found' });
    }

    // Calculate transport prices
    for (const city of itinerary.enrichedItinerary.itinerary) {
      let transferPrice = 0;
      let transferPriceWithoutCoupon = 0;

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
            transferPrice += transferPrice * (settings.flightMarkup / 100);
            transferPriceWithoutCoupon = transferPrice;

            // Apply flight markup
            
            if(discount.discountType === 'couponless' && discount.applicableOn.flights===true)
              {
                let response = await applyDiscountFunction({
                  discountId: discount._id,
                  userId: userId,
                  totalAmount: transferPrice
                });
                transferPrice -= response
              }
            
          }
        } if (mode === 'Car') {
          modeDetails = await Taxi.findById(modeId);
          if (modeDetails && modeDetails.price) {
            transferPrice = parseFloat(modeDetails.price);
            price += transferPrice;
            // Apply taxi markup
            transferPrice += transferPrice * (settings.taxiMarkup / 100);
            transferPriceWithoutCoupon = transferPrice
          }
        } if (mode === 'Ferry') {
          modeDetails = await Ferry.findById(modeId);
          if (modeDetails && modeDetails.price) {
            transferPrice = parseFloat(modeDetails.price);
            price += transferPrice;

            // Apply ferry markup
            transferPrice += transferPrice * (settings.ferryMarkup / 100);
            transferPriceWithoutCoupon = transferPrice
          }
        }
      }

      totalPrice += transferPrice;
      priceWithoutCoupon += transferPriceWithoutCoupon;
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
          priceWithoutCoupon += totalHotelPrice + (totalHotelPrice * (settings.stayMarkup / 100));
          price += totalHotelPrice;

          // Apply stay markup
          
          if(discount.discountType === 'couponless' && discount.applicableOn.hotels===true)
            {
              let response = await applyDiscountFunction({
                discountId: discount._id,
                userId: userId,
                totalAmount: totalHotelPrice
              });
              totalHotelPrice -= response
            }
          totalPrice += totalHotelPrice + (totalHotelPrice * (settings.stayMarkup / 100));; // Add to the overall total price
        }
      }
    }

    // Calculate activity prices
    const activityPricesPromises = itinerary.enrichedItinerary.itinerary.flatMap(city =>
      city.days.flatMap(day =>
        day.activities.map(async (activityId) => {
          const gptActivity = await GptActivity.findById(activityId);
          if (gptActivity) {
            const originalActivity = await Activity.findOne({ name: gptActivity.name });
            if (originalActivity && originalActivity.price) {
              const activityPricePerPerson = parseFloat(originalActivity.price);
              let totalActivityPrice = activityPricePerPerson * (adults + children); 
              
              // Apply discount logic if applicable
              if (discount.discountType === 'couponless' && discount.applicableOn.activities) {
                const response = await applyDiscountFunction({
                  discountId: discount._id,
                  userId: userId,
                  totalAmount: totalActivityPrice
                });
                totalActivityPrice -= response;
              }
    
              return isNaN(totalActivityPrice) ? 0 : totalActivityPrice;
            } else {
              logger.info(`No price found for activity with ID ${activityId} in city ${city.currentCity}`);
              return 0;
            }
          }
          return 0;
        })
      )
    );

    const activityPricesPromisesWithoutCoupon = itinerary.enrichedItinerary.itinerary.flatMap(city =>
      city.days.flatMap(day =>
        day.activities.map(async (activityId) => {
          const gptActivity = await GptActivity.findById(activityId);
          if (gptActivity) {
            const originalActivity = await Activity.findOne({ name: gptActivity.name });
            if (originalActivity && originalActivity.price) {
              const activityPricePerPerson = parseFloat(originalActivity.price);
              const totalActivityPrice = activityPricePerPerson * (adults + children); 
              return isNaN(totalActivityPrice) ? 0 : totalActivityPrice;
            } else {
              logger.info(`No price found for activity with ID ${activityId} in city ${city.currentCity}`);
              return 0; // Ensuring we return 0 instead of not returning anything
            }
          }
          return 0; // Ensuring we return 0 in case of missing gptActivity
        })
      )
    );
    const activityPrices = await Promise.all(activityPricesPromises);
    const activityPricesWithoutCoupon = await Promise.all(activityPricesPromisesWithoutCoupon);

    totalPrice += activityPrices.reduce((acc, price) => acc + price, 0);
    priceWithoutCoupon += activityPricesWithoutCoupon.reduce((acc, price) => acc + price, 0);
    // Apply destination markup
    const destination = await Destination.findOne({ name: itinerary.enrichedItinerary.destination });
    if (destination && destination.markup) {
      totalPrice += totalPrice * (destination.markup / 100);
      priceWithoutCoupon += priceWithoutCoupon * (destination.markup / 100);
    }

    if(discount.discountType === 'couponless' && discount.applicableOn.package===true)
      {
        let response = await applyDiscountFunction({
          discountId: discount._id,
          userId: userId,
          totalAmount: totalPrice
        });
        totalPrice -= response
      }
    // Store current total price before tax and service fee
    let currentTotalPrice = priceWithoutCoupon;
    const disc = currentTotalPrice - totalPrice;
    // Calculate and add 18% tax
    const taxAmount = currentTotalPrice * 0.18; // 18% tax
    
    currentTotalPrice += taxAmount;

    // Add service fee
    currentTotalPrice += settings.serviceFee;
    currentTotalPrice -=disc;

    // Store both current total price and final total price in the itinerary
    itinerary.currentTotalPrice = currentTotalPrice.toFixed(2);
    itinerary.totalPriceWithoutMarkup = price.toFixed(2);

    // Update the total price in the itinerary
    itinerary.totalPrice = totalPrice.toFixed(2);
    itinerary.couponlessDiscount = disc.toFixed(2)
    await itinerary.save();

    next();
  } catch (error) {
    console.error('Error recalculating total price:', error);
    res.status(500).json({ message: 'Error recalculating total price' });
  }
};
