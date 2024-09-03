import mongoose from "mongoose";

const TravelSegmentSchema = new mongoose.Schema({
    departure: { type: String, required: true },
    arrival: { type: String, required: true },
    departureTime: { type: Date, required: true },
    arrivalTime: { type: Date, required: true },
    carrierCode: { type: String },
    flightNumber: { type: String },
    trainNumber: { type: String },
    carNumber: { type: String },
    ferryNumber: { type: String },
    station: { type: String },
    riverport: { type: String },
    carPickUpPoint: { type: String },
    layoverDuration: { type: String },  
    layoverLocation: { type: String },  
    // mealIncluded: { type: Boolean, default: false },  //Not available in flight api  
    refundable: { type: Boolean, default: false }
  });

  export default mongoose.model('TravelSegment', TravelSegmentSchema)