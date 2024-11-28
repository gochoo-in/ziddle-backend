import mongoose from 'mongoose'
import Destination from './destination.js'

const requestCallbackSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination', required: true }
}, { timestamps: true, versionKey: false });

export default mongoose.model('CallbackRequest', requestCallbackSchema);