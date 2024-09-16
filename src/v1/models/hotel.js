import mongoose from 'mongoose';

const hotelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String },
  rating: { type: Number },
  price: { type: Number, required: true },
  currency: { type: String, required: true, default: 'INR' },
  image: { type: String },
  cancellation: { type: String },
  checkin: { type: String },
  checkout: { type: String },
  roomType: { type: String },
  refundable: { type: Boolean }
}, { timestamps: true, versionKey: false });

export default mongoose.model('Hotel', hotelSchema);
