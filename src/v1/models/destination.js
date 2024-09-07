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
    visa_type: {
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
    languages_spoken: {
        type: [String],
        default: []
    },
    best_time_to_visit: {
        type: String,
        default: ''
    },
    image_urls: {
        type: [String], 
        default: []
    },
    latitude: {
        type: String,
        required: true
    },
    longitude: {
        type: String,
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
}, { timestamps: true ,versionKey: false });

export default mongoose.model('Destination', destinationSchema);
