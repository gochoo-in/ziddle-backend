import mongoose from "mongoose";
import City from "./city.js";

const transportSchema = new mongoose.Schema({
    modeName: { type: String, required: true },
    description: { type: String, required: true },
    avgTravelTime: { type: String, required: true },
    costRange: {
        min: { type: String, required: true },
        max: { type: String, required: true },
        avg: { type: String, required: true },
    },
    isSustainable: { type: Boolean, required: true },
    citiesServiced: [{ type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true }],
    comfortLevel: { type: String, default: "Standard" },
    bookingProvider: {
        name: { type: String, required: true },
    },
    bookingUrl: { type: String, required: true },
    priceInINR: { type: String, required: true }
});


export default mongoose.model("Transport", transportSchema);
