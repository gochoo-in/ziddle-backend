import mongoose from 'mongoose';
import City from './city';
import Country from './country';

// Define the Itinerary schema
const ItinerarySchema = new mongoose.Schema({
  country: { type: mongoose.Schema.Types.ObjectId, ref: 'Country', required: true },
  min_nights: { type: Number },
  trip_days: { type: Number, required: true },
  startDate: { type: Date, required: true },
  travelling_with: { type: String, required: true },
  adults: { type: Number, required: true },
  children: { type: Number, required: true },
  cities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'City' }] 
});

// Export the Itinerary model
export default mongoose.model('Itinerary', ItinerarySchema);
