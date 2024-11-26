import mongoose from 'mongoose';

const InternationalAirportCitySchema = new mongoose.Schema({
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
  country: { type: String, required: true },
  countryCode: { type: String, required: true },
  mobileCode: { type: String, required: true },
  currency: { type: String, required: true },
  iataCode: { type: String, required: true },
  isActive: { type: Boolean, default: true }
}, { versionKey: false, timestamps: true });

export default mongoose.model('InternationalAirportCity', InternationalAirportCitySchema);
