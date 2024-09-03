import mongoose from "mongoose";
import Country from "../models/country";
const citySchema = new mongoose.Schema({
    name: { type: String, required: true },
    country: { type: mongoose.Schema.Types.ObjectId, ref: 'Country', required: true },
    iataCode: { type: String, required: true },
    images: [{ type: String }],
    activities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Activity' }],
    // hotels: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Hotel' }]
});

export default mongoose.model('City', citySchema);