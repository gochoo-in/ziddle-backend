import mongoose from 'mongoose';

const endpointSchema = new mongoose.Schema({
  title: { type: String, required: true },
  endpoint: { type: String, required: true },
  action: { type: String, enum: ['GET', 'POST', 'PATCH', 'DELETE'], required: true },
  category: { type: String, required: true }
},{ timestamps: true, versionKey: false });

export default mongoose.model('Endpoint', endpointSchema);
