import mongoose from 'mongoose';

const ActivitySchema = new mongoose.Schema({
    name: { type: String, required: true },
    duration: { type: String, required: true },
    description: { type: String },
    opensAt: { type: String, required: true },
    closesAt: { type: String, required: true },
    city: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true },
    bestTimeToParticipate: { type: String },
    physicalDifficulty: { type: String, required: true },
    requiredEquipment: { type: [String] },
    ageRestriction: { type: String },
    localGuidesAvailable: { type: Boolean, required: true },
    groupSize: { type: String },
    culturalSignificance: { type: String },
    idealCompanionType: { type: [String] },
    isFamilyFriendly: { type: Boolean, required: true },
    inclusions: { type: [String] },
    exclusions: { type: [String] },
    sharedActivity: { type: Boolean },
    refundable: { type: Boolean, required: true },
    price: { type: String, required: true }
}, { versionKey: false });

export default mongoose.model('Activity', ActivitySchema);
