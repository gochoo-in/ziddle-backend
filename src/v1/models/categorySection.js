import mongoose from 'mongoose';
import Destination from '../models/destination.js'

const SectionSchema = new mongoose.Schema({
    categoryName: { type: String, required: true },
    sectionTitle: { type: String, required: true },
    sectionSubtitle: { type: String },
    destinations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Destination', required: true }], 
    displayOrder: { type: Number, required: true },
    isHighlighted: { type: Boolean },
}, { timestamps: true, versionKey: false });

export default mongoose.model('Section', SectionSchema);
