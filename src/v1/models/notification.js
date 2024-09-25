import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true }, 
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
  message: { type: String, required: true }, 
  seen: { type: Boolean, default: false }, 
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true, versionKey: false });

export default mongoose.model('Notification', notificationSchema);
