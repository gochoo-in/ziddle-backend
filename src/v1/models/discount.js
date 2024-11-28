import mongoose from 'mongoose';
import Destination from './destination.js';

const discountSchema = new mongoose.Schema({
    applicableOn: {
        package: { type: Boolean, default: true },
        predefinedPackages: { type: Boolean, default: false },
        flights: { type: Boolean, default: false },
        hotels: { type: Boolean, default: false },
        activities: { type: Boolean, default: false }
    },
    destination: [{
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Destination', 
        default: []  // Default to an empty array
    }],
    discountType: {
        type: String,
        enum: ['general', 'couponless'], 
        default: 'general'
    },
    userType: {
        type: String,
        enum: ['all', 'old users', 'new users'], 
        default: 'all'
    },
    noOfUsesPerUser: {
        type: Number,
        required: true 
    },
    noOfUsersTotal: {
        type: Number,
        required: true
    },
    startDate: {
        type: Date, 
        required: false 
    },
    endDate: {
        type: Date, 
        required: false 
    },
    discountPercentage: {
        type: Number, 
        required: true 
    },
    maxDiscount: {
        type: Number,
        required: function() {
            return !this.noLimit; 
        },
        default: 0 
    },
    noLimit: {
        type: Boolean, 
        default: false 
    },
    active: {
        type: Boolean,
        default: true, 
    },
    archived: {
        type: Boolean,
        default: false, 
    },
    usedByUsers: [{ 
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }],
    // New fields to store total usage count and value
    totalDiscountUsageCount: {
        type: Number,
        default: 0 // Initialize with zero
    },
    totalDiscountValue: {
        type: Number,
        default: 0 // Initialize with zero
    }
}, { timestamps: true, versionKey: false });

// Middleware to set destinations based on user input
discountSchema.pre('save', async function(next) {
    if (this.isNew) {
        try {
            if (this.destination.length === 0) {
                // If no destinations are selected, fetch all destination IDs
                const destinations = await Destination.find({});
                this.destination = destinations.map(dest => dest._id);
            }
            next();
        } catch (err) {
            next(err);
        }
    } else {
        next();
    }
});

// Method to update discount usage count and total value
discountSchema.methods.updateUsage = async function(amount) {
    this.totalDiscountUsageCount += 1;
    this.totalDiscountValue += amount;
    await this.save();
};

export default mongoose.model('Discount', discountSchema);
