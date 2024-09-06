import mongoose from 'mongoose';

const countrySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
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
}, { versionKey: false });

export default mongoose.model('Country', countrySchema);
