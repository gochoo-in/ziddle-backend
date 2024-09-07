import mongoose from 'mongoose';
import Destination from './destination.js';

const CitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  iataCode: { type: String, required: true },
  destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination', required: true },
  country: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  best_time_to_visit: { type: String },
  is_major_hub: { type: Boolean, default: false },
  points_of_interest: [{ type: String }],
  climate: { type: String },
  language_spoken: { type: String, required: true },
  travel_time_from_hub: { type: Number }
}, { versionKey: false });

export default mongoose.model('City', CitySchema);
