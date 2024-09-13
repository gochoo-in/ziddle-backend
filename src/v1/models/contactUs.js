import mongoose from "mongoose";

const contactUsSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    message: { type: String, required: true }
}, { timestamps: true, versionKey: false });

export const contactUs = mongoose.model('ContactUs', contactUsSchema);