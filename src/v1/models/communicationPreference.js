import mongoose from 'mongoose'
import User from './user.js'

const communicationPreferenceSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    preferences: {
        productUpdates: {
            sms: { type: Boolean, default: false, required: true },
            whatsapp: { type: Boolean, default: false, required: true },
            email: { type: Boolean, default: true, required: true }
        },
        newsletters: {
            sms: { type: Boolean, default: false, required: true },
            whatsapp: { type: Boolean, default: false, required: true },
            email: { type: Boolean, default: true, required: true }
        },
        dealsAndOffers: {
            sms: { type: Boolean, default: false, required: true },
            whatsapp: { type: Boolean, default: false, required: true },
            email: { type: Boolean, default: true, required: true }
        },
        recommendations: {
            sms: { type: Boolean, default: false, required: true },
            whatsapp: { type: Boolean, default: false, required: true },
            email: { type: Boolean, default: true, required: true }
        }
    }
}, {timestamps: true, versionKey: false})

export default mongoose.model('CommunicationPreference', communicationPreferenceSchema);
