import mongoose from 'mongoose';
import Destination from './destination.js';

const CitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  iataCode: { type: String, required: true },
  destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination', required: true },
  country: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  bestTimeToVisit: { type: String },
  isMajorHub: { type: Boolean, default: false },
  pointsOfInterest: [{ type: String }],
  climate: { type: String },
  languageSpoken: { type: String, required: true },
  travelTimeFromHub: { type: Number }
}, { versionKey: false });

export default mongoose.model('City', CitySchema);
