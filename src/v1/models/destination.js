import mongoose from 'mongoose';


const counterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
});

// Check if the 'Counter' model is already defined, and reuse it if it exists
const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

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
    },
    recommended: {
        type: Boolean,
        default: false
    },
    active: {
        type: Boolean,
        default: true
    },
    markup: {
        type: Number,
        required: true
    },
    uniqueSmallId: {
        type: String,
        unique: true
    },
}, { timestamps: true, versionKey: false });

destinationSchema.pre('save', async function (next) {
    if (this.isNew) {
        try {
            // Find and increment the counter for 'destination' collection
            const counter = await Counter.findByIdAndUpdate(
                { _id: 'destination' },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }  // Upsert in case counter doesn't exist
            );

            // Generate the uniqueSmallId in the format 'D00001'
            const sequenceNumber = String(counter.seq).padStart(5, '0'); // Pad with zeros to get 5 digits
            this.uniqueSmallId = `D${sequenceNumber}`;

            next();
        } catch (err) {
            next(err);
        }
    } else {
        next();
    }
});

export default mongoose.model('Destination', destinationSchema);
