import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
    flightMarkup: {
        type: Number,
        required: true
    },
    taxiMarkup: {
        type: Number,
        required: true
    },
    ferryMarkup: {
        type: Number,
        required: true
    },
    interantionalFlightMarkup: {
        type: Number,
        required: true
    },
    stayMarkup: {
        type: Number,
        required: true
    },
    serviceFee: {
        type: Number,
        required: true
    },
    orderPercentageReferringUser: {
        type: Number,
        required: true
    },
    orderPercentageReferredUser: {
        type: Number,
        required: true
    },
    maxAmount: {
        type: Number,
        required: true
    }
});

export default mongoose.model('Setting', settingsSchema);

