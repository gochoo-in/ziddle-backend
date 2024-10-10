import mongoose from 'mongoose';

const adminPackageActivitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  startTime: { type: String },
  endTime: { type: String },
  duration: { type: String },
  timeStamp: { type: String },
  category: { type: String },
  cityId: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true },
}, { timestamps: true, versionKey: false });

export default mongoose.models.AdminPackageActivity || mongoose.model('AdminPackageActivity', adminPackageActivitySchema);
