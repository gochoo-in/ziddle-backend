import mongoose from 'mongoose';
import Activity from './activity';

const CitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  iataCode: { type: String, required: true },
  activities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Activity', required: true }] 
});

export default mongoose.model('City', CitySchema);
