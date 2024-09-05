import mongoose from 'mongoose';
import City from './city.js';  

const ActivitySchema = new mongoose.Schema({
    name: { type: String, required: true },
    duration: { type: String, required: true },
    category: { type: String, required: true },
    opensAt: { type: String, required: true },
    closesAt: { type: String, required: true },
    city: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true }  
}, { versionKey: false });

export default mongoose.model('Activity', ActivitySchema);
