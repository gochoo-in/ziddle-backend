import mongoose from 'mongoose';

const IndianCitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  imageUrls: {
    type: [{
        type: {
            type: String,
            required: true
        },
        url: {
            type: String,
            required: true
        }
    }],
    default: []
},
  isActive: { type: Boolean, default: true }
}, { versionKey: false, timestamps: true });

export default mongoose.model('IndianCity', IndianCitySchema);
