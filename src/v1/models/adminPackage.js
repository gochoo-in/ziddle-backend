import mongoose from "mongoose";
import City from "./city.js";
import Activity from "./activity.js";
import Mode from "./mode.js";
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
        ref: 'Employee',  // Assuming there is an Employee model
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
            enum: ['thumbnail', 'banner', 'gallery'] // Assuming there are defined types
        },
        url: { 
            type: String, 
            required: true, 
            trim: true // Ensure no extra spaces in URLs
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
        min: 0 // Ensuring price is not negative
    },
    hotelRating: { 
        type: Number, 
        required: true, 
        min: 1, 
        max: 5 // Assuming hotel rating is between 1 and 5 stars
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
}, { 
    timestamps: true, 
    versionKey: false // Remove the __v field for versioning
});

export default mongoose.model('AdminPackage', adminPackageSchema);


