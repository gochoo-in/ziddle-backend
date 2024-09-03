import mongoose from "mongoose";
import City from "./city";
import Activity from "./activity";
import Mode from './mode'

const JourneySegmentSchema = new mongoose.Schema({
    currentCity: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true },
    nextCity: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true },
    stayDays: { type: Number, required: true, min: 0 },
    days: [{
      day: { type: Number, required: true },
      date: { type: Date, required: true },
      activities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Activity' }]
    }],
    // hotels: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Hotel' }],
    transport: {
      mode: { type: String, required: true, enum: ['Flight', 'Train', 'Ferry', 'Car'] },
      mode_details: { type: mongoose.Schema.Types.ObjectId, ref: 'Mode', required: true }
    }
  });
  

  export default mongoose.model('JourneySegment', JourneySegmentSchema);