import mongoose from 'mongoose'
import User from './user.js'

const communicationPreferenceSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    preferences: {
        productUpdates: {
            sms: { type: Boolean, default: false },
            whatsapp: { type: Boolean, default: false },
            email: { type: Boolean, default: true }
        },
        newsletters: {
            sms: { type: Boolean, default: false },
            whatsapp: { type: Boolean, default: false },
            email: { type: Boolean, default: true }
        },
        dealsAndOffers: {
            sms: { type: Boolean, default: false },
            whatsapp: { type: Boolean, default: false },
            email: { type: Boolean, default: true }
        },
        recommendations: {
            sms: { type: Boolean, default: false },
            whatsapp: { type: Boolean, default: false },
            email: { type: Boolean, default: true }
        }
    }
}, {timestamps: true, versionKey: false})

export default mongoose.model('CommunicationPreference', communicationPreferenceSchema);
