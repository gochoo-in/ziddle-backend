import mongoose from "mongoose";

const ModeDetailsSchema = new mongoose.Schema({
    fromCity: { type: String, required: true },
    toCity: { type: String, required: true },
    departureDate: { type: Date, required: true },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true },
    airline: { type: String },
    travelSegments: [TravelSegmentSchema],
    // timeZone: { type: String, required: true }, //Not available
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  });
  
  export default mongoose.model('Mode', ModeDetailsSchema);