import mongoose from "mongoose";
import City from './city.js';

const accommodationSchema = new mongoose.Schema({
    hotelName: { type: String, required: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    roomType: { type: String, required: true },
    pricePerNight: { type: Number, required: true },
    city: { type: mongoose.Schema.Types.UUID, ref: 'City', required: true },
    amenities: [{ type: String }],
    nonRefundable: { type: Boolean, required: true },
    facilities: [{ type: String }]
}, { timestamps: true, versionKey: false });

export default mongoose.model('Accommodation', accommodationSchema);
