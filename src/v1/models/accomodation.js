import mongoose from "mongoose";

const accommodationSchema = new mongoose.Schema({
    name: { type: String, required: true },
    address: { type: String, required: true },
    rating: { 
        type: Number, 
        required: true,
        min: [1, 'Rating must be at least 1'],
        max: [10, 'Rating cannot exceed 10']
    },
    price: { type: String, required: true },
    currency: { 
        type: String, 
        required: true,
        match: [/^[A-Z]{3}$/, 'Currency code must be a 3-letter uppercase string']
    },
    image: { type: String },
    cancellation: { type: String, required: true },
    checkin: { type: Date, required: true },
    checkout: { type: Date, required: true },
    roomType: { type: String, required: true },
    refundable: { type: Boolean, required: true }
}, { timestamps: true, versionKey: false });

export default mongoose.model('Accommodation', accommodationSchema);
