import mongoose from "mongoose";
import City from "./city.js";
import Destination from "./destination.js";

const profileSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    preferredLanguage: { type: String },
    address: {
        line1: { type: String, required: true },
        line2: { type: String },
        line3: { type: String },
        state: { type: String },
        pincode: { type: String, required: true },
        nationality: { type: String }
    },
    profilePhoto: {
        type: {
            type: String,
        },
        url: {
            type: String,
        }
    },
    phoneNumber: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true, versionKey: false });

export default mongoose.model('Profile', profileSchema);
