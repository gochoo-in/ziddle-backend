import mongoose from 'mongoose';
import moment from 'moment';

const commentSchema = new mongoose.Schema({
  text: { type: String, required: true },
  date: { type: Date, default: Date.now },
});

const leadSchema = new mongoose.Schema(
  {
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    itineraryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Itinerary', required: true },
    status: {
      type: String,
      enum: ['ML', 'SL', 'HCL', 'Closed', 'Booked', 'Refund', 'Cancelled'],
      default: 'ML',
    },
    assignedTo: { type: String },
    assignedAt: { type: Date },
    contactNumber: { type: String, required: true }, // Contact number is required
    uniqueSmallId: { type: String, unique: true },
    comments: [commentSchema],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false, timestamps: true }
);

// Pre-save hook to generate uniqueSmallId
leadSchema.pre('save', async function (next) {
  if (this.isNew) {
    try {
      // Format date as YYMMDD
      const formattedDate = moment().format('YYMMDD');

      // Get the last 6 digits of the contact number
      const lastSixDigits = this.contactNumber.slice(-6);

      // Combine date and last 6 digits of contact number to form the base ID
      const baseuniqueSmallId = `${formattedDate}${lastSixDigits}`;

      // Find all leads created by the same contact on the same day
      const existingLeads = await mongoose.model('Lead').find({
        uniqueSmallId: { $regex: `^${baseuniqueSmallId}` },
      });

      // If there are existing leads, increment the suffix
      if (existingLeads.length > 0) {
        const suffix = String(existingLeads.length + 1).padStart(2, '0');
        this.uniqueSmallId = `${baseuniqueSmallId}-${suffix}`;
      } else {
        // First lead for this date and contact number
        this.uniqueSmallId = baseuniqueSmallId;
      }

      next();
    } catch (err) {
      next(err);
    }
  } else {
    next();
  }
});

const Lead = mongoose.model('Lead', leadSchema);

export default Lead;
