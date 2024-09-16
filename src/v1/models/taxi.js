import mongoose from 'mongoose';

const taxiSchema = new mongoose.Schema({
  transferId: { type: String, required: true },
  pickupLocation: { type: String, required: true },
  dropoffLocation: { type: String, required: true },
  departureTime: { type: String },
  duration: { type: Number },
  arrivalTime: { type: String },
  vehicleType: { type: String },
  passengerCount: { type: Number },
  luggageAllowed: { type: Number },
  price: { type: String, required: true },
  currency: { type: String, required: true },
  sharedTransfer: { type: Boolean }
}, { timestamps: true, versionKey: false });

export default mongoose.model('Taxi', taxiSchema);
