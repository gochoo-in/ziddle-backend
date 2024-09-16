import mongoose from "mongoose";
import City from "./city.js";
import Activity from "./activity.js";
import Transport from "./transportation.js";
import Destination from "./destination.js";
import User from './employee.js'

const adminPackageSchema = new mongoose.Schema({
    destinationId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Destination', 
        required: true 
    },
    employeeId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Employee', 
        required: true 
    },
    templateName: { 
        type: String, 
        required: true, 
        trim: true  // Trim whitespace
    },
    imageUrls: [{
        type: { 
            type: String, 
            required: true, 
            enum: ['thumbnail', 'banner', 'gallery'] // Image type
        },
        url: { 
            type: String, 
            required: true, 
            trim: true // Clean URL strings
        }
    }],
    duration: { 
        type: String, 
        required: true, 
        trim: true 
    },
    basePrice: { 
        type: Number, 
        required: true, 
        min: 0 // Non-negative price per person
    },
    hotelRating: { 
        type: Number, 
        required: true, 
        min: 1, 
        max: 5 // Hotel rating between 1 and 5 stars
    },
    cityIds: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'City', 
        required: true 
    }],
    activityIds: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Activity', 
        required: true 
    }],
    transportationIds: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Mode', 
        required: true 
    }],
    isCustomizable: { 
        type: Boolean, 
        required: true, 
        default: false 
    },
    packageType: {
        type: String, 
        enum: ['India', 'International'],  // Package type can be either India or International
        required: true
    },
    travelCompanion: {
        type: [String],
        enum: ['Friends', 'Family', 'Couple', 'Solo'],  // Enum for travel companions
        required: true
    },
    budgetRange: { 
        min: { type: Number,}, 
        max: { type: Number,}  
    },
    tripDuration: { 
        type: String, 
        required: true  // Make sure this field is required in your schema
    }
}, { 
    timestamps: true, 
    versionKey: false // No __v versioning key
});


export default mongoose.model('AdminPackage', adminPackageSchema);


