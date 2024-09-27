import mongoose from 'mongoose';

const IndianCitySchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., New Delhi, Mumbai
  imageUrl: { type: String, required: true }, // URL for the city image
  isActive: { type: Boolean, default: true }, // Indicates if the city is available for departure
  isMajorHub: { type: Boolean, default: false }, // Flag for major cities like New Delhi, Mumbai
}, { versionKey: false });

export default mongoose.model('IndianCity', IndianCitySchema);
