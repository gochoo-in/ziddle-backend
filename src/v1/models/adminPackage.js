// adminPackage.js
import mongoose from "mongoose";

const adminPackageSchema = new mongoose.Schema({
  packageName: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  destination: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Destination',
    required: true,
  },
  cities: [{
    city: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'City',
      required: true,
    },
    stayDays: {
      type: Number,
      required: true,
    },
    days: [{
      day: {
        type: Number,
        required: true,
      },
      date: { // Add this line for the date field
        type: String,
        required: true,
      },
      activities: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GptActivity',
      }],
      _id: false
    }],
    transportToNextCity: {
      mode: {
        type: String,
        enum: ['Flight', 'Car', 'Ferry'],
      },
    },
    hotelDetails: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hotel',
      default: null,
    },
    _id: false
  }],
  totalDays: {
    type: Number,
    required: true,
  },
  startDate: {
    type: String,
    required: true,
  },
  endDate: {
    type: String,
    required: true,
  },
  price: {
    type: String,
    required: true,
  },
  imageUrls: [{
    type: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
  }],
  createdBy: {
    name: {
      type: String,
      required: true,
    },
    image: {
      type: {
        type: String,
      },
      url: {
        type: String,
      },
    },
  },
}, { timestamps: true, versionKey: false });

export default mongoose.model('AdminPackage', adminPackageSchema);
