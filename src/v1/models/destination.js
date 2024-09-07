import mongoose from 'mongoose';

const destinationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        default: ''
    },
    category: {
        type: String,
    },
    visaType: {
        type: String,
        required: true
    },
    country: {
        type: String,
        required: true
    },
    continent: {
        type: String,
        required: true
    },
    languagesSpoken: {
        type: [String],
        default: []
    },
    bestTimeToVisit: {
        type: String,
        default: ''
    },
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
    latitude: {
        type: Number,
        required: true
    },
    longitude: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        required: true
    },
    timezone: {
        type: String,
        required: true,
        match: /^UTC[+-]\d{2}:\d{2}$/ 
    },
    tripDuration: {
        type: [String], 
        required: true
    }
}, { timestamps: true, versionKey: false });

export default mongoose.model('Destination', destinationSchema);
