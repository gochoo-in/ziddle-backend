import mongoose from 'mongoose';

const policySchema = new mongoose.Schema({
    ptype: { type: String, required: true},  // Policy type, e.g., 'p'
    v0: { type: String, required: true },  // Subject (User ID)
    v1: { type: String, required: true },  // Object (API endpoint)
    v2: { type: String, required: true }   // Action (GET, POST, etc.)
}, { timestamps: true, versionKey: false });

export default mongoose.model('casbinpolicy', policySchema);
