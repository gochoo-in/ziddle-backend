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
        match: /^UTC[+-]\d{2}:\d{2}$/ // Matches 'UTC+07:00', 'UTC-05:00', etc.
    }
}, { versionKey: false });

export default mongoose.model('Country', countrySchema);
