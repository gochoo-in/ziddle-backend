import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  text: { type: String, required: true },
  date: { type: Date, default: Date.now }
});

const leadSchema = new mongoose.Schema({
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  itineraryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Itinerary', required: true },
  status: { type: String, enum: ['ML', 'SL', 'HCL', 'Closed', 'Booked', 'Refund'], default: 'ML' },
  assignedTo: { type: String },
  assignedAt: { type: Date },
  comments: [commentSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { versionKey: false, timestamps: true });

const Lead = mongoose.model('Lead', leadSchema);

export default Lead;
