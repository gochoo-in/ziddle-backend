import mongoose from 'mongoose';


const counterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
  });
  
  // Check if the 'Counter' model is already defined, and reuse it if it exists
  const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

const ActivitySchema = new mongoose.Schema({
    name: { type: String, required: true },
    duration: { type: String, required: true },
    featured: { type: Boolean, default: false, required: true },
    smallId: {
        type: String,
        unique: true,
      },
    description: { type: String },
    imageUrls: {
        type: [{
            type: {
                type: String,
                required: true
            },
            url: {
                type: String,
                required: true
            }
        }],
        default: []
    },
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
    price: { type: String, required: true },
    isActive: { type: Boolean, default: false }
}, { versionKey: false });



ActivitySchema.pre('save', async function (next) {
    if (this.isNew) {
        try {
            // Find and increment the counter for 'activity' collection
            const counter = await Counter.findByIdAndUpdate(
                { _id: 'activity' },  // Using 'activity' as the counter ID
                { $inc: { seq: 1 } },
                { new: true, upsert: true }  // Upsert in case counter doesn't exist
            );

            // Generate the smallId in the format 'A00001'
            const sequenceNumber = String(counter.seq).padStart(5, '0');  // Pad with zeros to get 5 digits
            this.smallId = `A${sequenceNumber}`;

            next();
        } catch (err) {
            next(err);
        }
    } else {
        next();
    }
});


export default mongoose.model('Activity', ActivitySchema);
