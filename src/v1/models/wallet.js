import mongoose from 'mongoose'
import User from './user.js'
import Itinerary from './itinerary.js';

const walletSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    balance: { type: String, required: true, default: '0' },
    transactions: {
        type: [
            {
                itinerary: { type: mongoose.Schema.Types.ObjectId, ref: 'Itinerary' },
                transactionAmount: { type: String },
                transactionDate: { type: Date },
                reason: { type: String }
            }
        ],
        default: []
    }
}, { timestamps: true, versionKey: false });


export default mongoose.model('Wallet', walletSchema);
