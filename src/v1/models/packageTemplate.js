import mongoose from "mongoose";
import City from "./city.js";
import Activity from "./activity.js";
import Mode from "./mode.js";
import Destination from "./destination.js";
import User from './user.js'

const packageTemplateSchema = new mongoose.Schema({
    destinationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    templateName: { type: String, required: true },
    imageUrls: [{
        type: { type: String, required: true },
        url: { type: String, required: true }
    }],
    duration: { type: String, required: true },
    basePrice: { type: Number, required: true },
    hotelRating: { type: Number, required: true },
    cityIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true }],
    activityIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Activity', required: true }],
    transportationIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Mode', required: true }],
    isCustomizable: { type: Boolean, required: true },
    thirdPartyBookings: {
        flight: {
            provider: { type: String },
            bookingUrl: { type: String },
            price: { type: Number }
        },
        hotel: {
            provider: { type: String },
            bookingUrl: { type: String },
            pricePerNight: { type: Number }
        },
        car: {
            provider: { type: String },
            bookingUrl: { type: String },
            pricePerDay: { type: Number }
        },
        ferry: {
            provider: { type: String },
            bookingUrl: { type: String },
            price: { type: Number }
        },
        train: {
            provider: { type: String },
            bookingUrl: { type: String },
            price: { type: Number }
        }
    }
}, { timestamps: true, versionKey: false });

export default mongoose.model('PackageTemplate', packageTemplateSchema);

