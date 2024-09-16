import mongoose from "mongoose";
import City from "./city.js";

const flightSchema = new mongoose.Schema({
    departureCityId: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true },
    arrivalCityId: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true },
    baggageIncluded: { type: Boolean, required: true },
    baggageDetails: {
        cabinBag: { type: Number },
        checkedBag: { type: Number }
    },
    price: { type: Number, required: true },
    currency: { type: String, required: true },
    airline: { type: String, required: true },
    departureDate: { type: Date }, 
    flightSegments: [{
        departureTime: { type: Date, required: true },
        arrivalTime: { type: Date, required: true },
        flightNumber: { type: Number, required: true }
    }]
}, { timestamps: true, versionKey: false });

export default mongoose.model('Flight', flightSchema);
