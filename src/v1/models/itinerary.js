import mongoose from 'mongoose';
import GptActivity from './gptactivity.js';
import Hotel from './hotel.js';
import User from './user.js'

const activitySchema = new mongoose.Schema({
  day: { type: Number, required: true },
  date: { type: Date, required: true },
  activities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'GptActivity', required: true }]
}, { _id: false });

const transportSchema = new mongoose.Schema({
  mode: { 
    type: String, 
    required: true, 
    enum: ['Flight', 'Car','Ferry'] 
  },
  modeDetails: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'transport.modeDetailsModel',
    default: null
  },
  modeDetailsModel: {
    type: String,
    enum: ['Flight', 'Taxi','Ferry'] 
  }
}, { _id: false });

const itineraryDaySchema = new mongoose.Schema({
  currentCity: { type: String, required: true },
  nextCity: { type: String, default: null },
  stayDays: { type: Number, required: true },
  transport: { type: transportSchema, default: null },
  transferCostPerPersonINR: { type: Number, default: null },
  transferDuration: { type: String, default: null },
  days: [activitySchema],
  hotelDetails: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', default: null }
}, { _id: false });

const enrichedItinerarySchema = new mongoose.Schema({
  title: { type: String, required: true },
  subtitle: { type: String, required: true },
  destination:{type:String,required:true},
  itinerary: [itineraryDaySchema],
  totalDays: { type: Number, required: true },
  totalNights: { type: Number, required: true }
}, { _id: false });

const itinerarySchema = new mongoose.Schema({
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  enrichedItinerary: { type: enrichedItinerarySchema, required: true }
}, { timestamps: true, versionKey: false });

const Itinerary = mongoose.model('Itinerary', itinerarySchema);

export default Itinerary;
