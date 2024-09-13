import mongoose, { Mongoose } from "mongoose";
import Mode from './mode.js'

const transferSchema = new mongoose.Schema({
    pickupLocation: { type: String, required: true },
    dropoffLocation: { type: String, required: true },
    departureTime: { type: Date, required: true },
    arrivalTime: { type: Date, required: true },
    mode: { type: mongoose.Schema.Types.ObjectId, ref: 'Mode', required: true },
    passengerCount: { type: Number, required: true },
    luggageAllowed: { type: Number, required: true },
    price: { type: Number, required: true },
    currency: { type: String, required: true},
    sharedTransfer: { type: Boolean, required: true }
}, { timestamps: true, versionKey: false });

export default mongoose.model('Transfer', transferSchema);
