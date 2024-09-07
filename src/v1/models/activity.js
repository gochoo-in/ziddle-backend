import mongoose from 'mongoose';

const ActivitySchema = new mongoose.Schema({
    name: { type: String, required: true },
    duration: { type: String, required: true },
    description: { type: String },
    opensAt: { type: String, required: true },
    closesAt: { type: String, required: true },
    city: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true },
    best_time_to_participate: { type: String },
    physical_difficulty: { type: String, required: true },
    required_equipment: { type: [String] },
    age_restriction: { type: String },
    local_guides_available: { type: Boolean, required: true },
    group_size: { type: String },
    cultural_significance: { type: String },
    ideal_companion_type: { type: [String] },
    is_family_friendly: { type: Boolean, required: true },
    inclusions: { type: [String] },
    exclusions: { type: [String] },
    shared_activity: { type: Boolean },
    refundable: { type: Boolean, required: true },
    price: { type: Number, required: true }
}, { versionKey: false });

export default mongoose.model('Activity', ActivitySchema);
