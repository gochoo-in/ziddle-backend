import mongoose from 'mongoose';

const ferrySchema = new mongoose.Schema({
    transferId: {
        type: String,
        required: true,
    },
    pickupLocation: {
        type: String,
        required: true,
    },
    dropoffLocation: {
        type: String,
        required: true,
    },
    departureTime: {
        type: Date,
        required: true,
    },
    duration: {
        type: String, 
        required: true,
    },
    arrivalTime: {
        type: Date,
        required: true,
    },
    vehicleType: {
        type: String,
        default: 'Ferry', // Default value for vehicle type
    },
    passengerCount: {
        type: Number,
        required: true,
    },
    luggageAllowed: {
        type: Number,
        required: true,
    },
    price: {
        type: String, // Store price as a string to maintain precision
        required: true,
    },
    currency: {
        type: String,
        required: true,
        default: 'INR', // Default currency is INR
    },
    sharedTransfer: {
        type: Boolean,
        default: false, // Default value is false (not shared)
    },
}, { versionKey:false,timestamps: true });

const Ferry = mongoose.model('Ferry', ferrySchema);

export default Ferry;
