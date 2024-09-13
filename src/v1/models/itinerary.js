import mongoose from 'mongoose';
import Activity from './activity.js';
import City from './city.js';
import Flight from './flight.js';
import Mode from './mode.js';
import Transfer from './transfer.js';

const itinerarySchema = new mongoose.Schema({
  cities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'City' }],
  activities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Activity' }],
  flights: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Flight' }],
  modes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Mode' }],
  transfers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Transfer' }],
  totalCost: { type: Number },
  totalDuration: { type: String }
}, { timestamps: true, versionKey: false });

export default mongoose.model('Itinerary', itinerarySchema);
