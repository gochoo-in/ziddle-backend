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
import { applyDiscountFunction, applyGeneralDiscount } from '../v1/modules/discount/discount.controller.js';
import logger from '../config/logger.js';
import StatusCodes from 'http-status-codes';
import httpFormatter from './formatter.js';

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
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Itinerary not found', false));
    }

    const { adults, children } = itinerary;
    let totalPrice = 0;
    let priceWithoutCoupon = 0;
    let price = 0;

    // Initialize total price variables for different transport modes and hotels
    let totalFlightsPrice = 0;
    let totalTaxisPrice = 0;
    let totalFerriesPrice = 0;
    let totalHotelsPrice = 0;
    let totalActivitiesPrice = 0;
    let internationalTotalFlightsPrice = 0; 

    // Fetch settings to access markup values and service fee
    const settings = await Settings.findOne();
    if (!settings) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Settings not found', false));
    }

    if (itinerary.internationalFlights && itinerary.internationalFlights.length > 0) {
      const internationalFlights = await Flight.find({ '_id': { $in: itinerary.internationalFlights } });
      for (const flight of internationalFlights) {
        if (flight.price) {
          const flightPrice = parseFloat(flight.price);
          internationalTotalFlightsPrice += flightPrice;
          totalPrice += flightPrice; // Add to totalPrice
          priceWithoutCoupon += flightPrice; // Add to priceWithoutCoupon
        }
      }
    }
    
    // Calculate transport prices (including domestic flights) and add to priceWithoutCoupon
    let domesticFlightsPrice = 0;
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
            domesticFlightsPrice += transferPrice * (1 + settings.flightMarkup / 100); // Include markup
            price += transferPrice;
            transferPrice += transferPrice * (settings.flightMarkup / 100);
            transferPriceWithoutCoupon = transferPrice;
          }
        } else if (mode === 'Car') {
          modeDetails = await Taxi.findById(modeId);
          if (modeDetails && modeDetails.price) {
            transferPrice = parseFloat(modeDetails.price);
            totalTaxisPrice += transferPrice * (1 + settings.taxiMarkup / 100); // Include markup
            price += transferPrice;
            transferPrice += transferPrice * (settings.taxiMarkup / 100);
            transferPriceWithoutCoupon = transferPrice;
          }
        } else if (mode === 'Ferry') {
          modeDetails = await Ferry.findById(modeId);
          if (modeDetails && modeDetails.price) {
            transferPrice = parseFloat(modeDetails.price);
            totalFerriesPrice += transferPrice * (1 + settings.ferryMarkup / 100); // Include markup
            price += transferPrice;
            transferPrice += transferPrice * (settings.ferryMarkup / 100);
            transferPriceWithoutCoupon = transferPrice;
          }
        }
      }
    
      totalPrice += transferPrice;
      priceWithoutCoupon += transferPriceWithoutCoupon;
    }
    
    // Calculate total flight price (domestic + international) and apply discount
    const totalFlightPrice = internationalTotalFlightsPrice + domesticFlightsPrice;
    
    if (discount && discount.discountType === 'couponless' && discount.applicableOn.flights) {
      const response = await applyDiscountFunction({
        discountId: discount._id,
        userId: userId,
        totalAmount: totalFlightPrice
      });
      if (response.discountAmount) {
        const discountAmount = response.discountAmount;
        totalPrice  -= discountAmount; 
      } 
    }
    const rooms = itinerary.rooms;
    for (const city of itinerary.enrichedItinerary.itinerary) {
      let hotelPrice = 0;
    
      // Check if hotelDetails is not null (it should be a string (ID) or null)
      if (city.hotelDetails) {
        const hotel = await Hotel.findById(city.hotelDetails); // Fetch the hotel by ID
        if (hotel && hotel.price) {
          hotelPrice = parseFloat(hotel.price) * rooms.length; // Assuming 'rooms' is an array with room count
        }
      }
    
      // If hotelPrice is greater than 0, add it to the total prices
      if (hotelPrice > 0) {
        // Apply markup to hotel price
        const hotelPriceWithMarkup = hotelPrice * (1 + settings.stayMarkup / 100);
        totalHotelsPrice += hotelPriceWithMarkup; // Add hotel price with markup to totalHotelsPrice
        priceWithoutCoupon += hotelPrice + hotelPriceWithMarkup; // Add base price + markup to priceWithoutCoupon
    
        // Log the hotel price without coupon
        logger.info(`Added hotel cost for city ${city.currentCity}: ${hotelPrice}, Total Price Now (without coupon): ${priceWithoutCoupon}`);
    
        price += hotelPrice; // Add the base price to price (this is before discount application)
    
        // Apply discount if applicable
        if (discount && discount.discountType !== null) {
          if (discount.discountType === 'couponless' && discount.applicableOn.hotels === true) {
            let response = await applyDiscountFunction({
              discountId: discount._id,
              userId: userId,
              totalAmount: hotelPrice,
            });
            if (response.discountAmount) {
              hotelPrice -= response.discountAmount; // Apply discount to hotel price
            }
          }
        }
    
        // Add final hotel price (with discount and markup) to totalPrice
        totalPrice += hotelPrice + hotelPriceWithMarkup; // Add hotel price with discount and markup to totalPrice
        logger.info(`Added hotel cost for city ${city.currentCity} with markup and discount: ${hotelPrice + hotelPriceWithMarkup}, Total Price Now: ${totalPrice}`);
      }
    }
    


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
    const activityPricesWithoutCoupon = await Promise.all(activityPricesPromisesWithoutCoupon);
    let activityPrices = activityPricesWithoutCoupon.reduce((acc, price) => acc + price, 0);
    if (discount && discount.discountType != null) {
      if (discount.discountType === 'couponless' && discount.applicableOn.activities === true) {
        let response = await applyDiscountFunction({
          discountId: discount._id,
          userId: userId,
          totalAmount: activityPrices
        });
        if(response.discountAmount){
          activityPrices -= response.discountAmount;
        }
      }
    }
    totalPrice += activityPrices;
    totalActivitiesPrice = activityPricesWithoutCoupon.reduce((acc, price) => acc + price, 0);
    priceWithoutCoupon += activityPricesWithoutCoupon.reduce((acc, price) => acc + price, 0);
    // Apply destination markup
    const destination = await Destination.findOne({ name: itinerary.enrichedItinerary.destination });
    if (destination && destination.markup) {
      totalPrice += totalPrice * (destination.markup / 100);
      priceWithoutCoupon += priceWithoutCoupon * (destination.markup / 100);
    }

    if (discount && discount.discountType != null) {
      if (discount.discountType === 'couponless' && discount.applicableOn.package === true) {
        let response = await applyDiscountFunction({
          discountId: discount._id,
          userId: userId,
          totalAmount: totalPrice
        });
        if(response.discountAmount){
          totalPrice -= response.discountAmount;
        }
      }
    }

    // Store current total price before tax and service fee
    let grandTotal = priceWithoutCoupon;
    const disc = grandTotal - totalPrice;
    totalPrice += disc;
    // Calculate and add 18% tax
    const taxAmount = grandTotal * 0.18; // 18% tax
    const tax = totalPrice * 0.18;

    grandTotal += taxAmount;

    // Add service fee
    grandTotal += settings.serviceFee;
    grandTotal -= disc;

    // Store both current total price and final total price in the itinerary
    itinerary.grandTotal = grandTotal.toFixed(2);
    itinerary.totalPriceWithoutMarkup = price.toFixed(2);

    // Update the total price in the itinerary
    itinerary.totalPrice = totalPrice.toFixed(2);
    itinerary.couponlessDiscount = disc.toFixed(2);

    // Storing totals for transport and hotels
    itinerary.totalFlightsPrice = totalFlightsPrice.toFixed(2);
    itinerary.totalTaxisPrice = totalTaxisPrice.toFixed(2);
    itinerary.totalFerriesPrice = totalFerriesPrice.toFixed(2);
    itinerary.totalHotelsPrice = totalHotelsPrice.toFixed(2);
    itinerary.totalActivitiesPrice = totalActivitiesPrice.toFixed(2);
    itinerary.internationalTotalFlightsPrice = internationalTotalFlightsPrice.toFixed(2); 
    itinerary.tax = tax.toFixed(2);


    await itinerary.save();
    for (const discountIds of itinerary.discounts) {
      const discountObject = await Discount.findById(discountIds);
      if (discountObject && discountObject.discountType === 'general') {
        const discId = discountIds.toString()
        await applyGeneralDiscount({
          userId,
          discId,
          itineraryId
        });
      }
    }
    await itinerary.save();
    return itinerary;
  } catch (error) {
    console.error('Error calculating total price:', error);
    res.status(500).json({ message: 'Error calculating total price', error });
  }
};
