import mongoose from "mongoose";
import Traveler from "./traveler";
import Country from "./country";
import User from "./user";

const ItinerarySchema = new mongoose.Schema({
    title: { type: String, required: true },
    subtitle: { type: String },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    country: { type: mongoose.Schema.Types.ObjectId, ref: 'Country', required: true },
    journeySegments: [JourneySegmentSchema],
    status: { type: String, enum: ['Ongoing', 'Upcoming'], required: true },
    totalDays: { type: Number, required: true, min: 0 },
    totalNights: { type: Number, required: true, min: 0 },
    tripPrice: { type: Number, required: true },
    tripDiscount: { type: Number, default: 0 },
    serviceFee: { type: Number, required: true },
    taxes: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    travelers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Traveler' }],
    // bookingDetails: [{
    //   room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true }, // Refers to Room schema
    //   traveler: { type: mongoose.Schema.Types.ObjectId, ref: 'Traveler' }, // Refers to Traveler schema
    //   amount: { type: Number, required: true }
    // }]
  });
  
  export default mongoose.model('Itinerary', ItinerarySchema);