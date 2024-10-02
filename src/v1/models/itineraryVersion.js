import mongoose from 'mongoose';

const itineraryVersionSchema = new mongoose.Schema({
  itineraryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Itinerary', required: true }, // Reference to the original itinerary
  version: { type: Number, required: true }, // Version number
  enrichedItinerary: { type: Object, required: true }, // Full state of the itinerary
  changedBy: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Reference to the user who made the change
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' } // Reference to the admin who made the change (if applicable)
  },
  comment: { type: String, default: '' }, // Comment to describe what change was made
  createdAt: { type: Date, default: Date.now } // Timestamp of when the version was created
}, { versionKey: false, timestamps: true });


const ItineraryVersion = mongoose.model('ItineraryVersion', itineraryVersionSchema);

export default ItineraryVersion;
