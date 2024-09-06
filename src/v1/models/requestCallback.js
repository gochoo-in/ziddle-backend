import mongoose from 'mongoose'

const requestCallbackSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    destination: { type: String, required: true }
}, { timestamps: true, versionKey: false });

export default mongoose.model('CallbackRequest', requestCallbackSchema);