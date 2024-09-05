import mongoose from 'mongoose';
import Country from './country.js';  

const CitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  iataCode: { type: String, required: true },
  activities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Activity' }],  
  country: { type: mongoose.Schema.Types.ObjectId, ref: 'Country', required: true } 
}, { versionKey: false });

export default mongoose.model('City', CitySchema);
