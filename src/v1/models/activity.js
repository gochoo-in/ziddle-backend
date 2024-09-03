import mongoose from "mongoose";
import City from "./city";
import Country from "./country";
import User from './user'
export const activitySchema = mongoose.Schema({
    name: { type: String, required: true },
    description: { type: Strung, required: true},
    location: {
        address: {
            type: String,
            required: true
        },
        city: {
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'City', 
            required: true
        },
        country: {
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Country', 
            required: true
        }
    },
    duration: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    images: [{
        type: String
    }],
    highlights: [{
        type: String
    }],
    inclusions: [{
        type: String
    }],
    exclusions: [{
        type: String
    }],
    meetingPoints: [{
        name: {
            type: String
        },
        description: {
            type: String
        }
    }],
    whatToExpect: [{
        place: {
            type: String
        },
        description: {
            type: String
        },
        mapLink: {
            type: String
        }
    }],
    ticketOptions: [{
        optionName: { type: String },
        priceAdjustment: { type: Number },
        timeslots: [{
          time: { type: String },
          priceDifference: { type: Number }
        }]
      }],
      timeStamp: { type: String, required: true }, // Morning, Evening etc
      price: {
        amount: { type: Number, required: true },
        currency: { type: String, default: 'INR' },
        discounts: { type: Number, default: 0 }
      },
      ratings: {
        average: { type: Number, min: 0, max: 5 },
        reviews: [{
          reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          rating: { type: Number, min: 0, max: 5 },
          comment: { type: String },
          date: { type: Date, default: Date.now }
        }]
      },
      date: { type: Date, required: true },
      startTime: { type: String, required: true }, 
      endTime: { type: String, required: true },
      additionalInformation: {
        cancellationPolicy: { type: String },
        healthAndSafety: { type: String },
        accessibility: { type: String },
        termsAndConditions: { type: String }
      },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
})

export default mongoose.model('Activity',activitySchema)