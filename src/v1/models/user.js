import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    phoneNumber: {
        type: String, 
        required: true,
        unique: true,
    },
    email: {
        type: String,
        unique: true, 
        sparse: true, 
    },
    otp: {
        type: String,
    },
    otpExpires: {
        type: Date,
    },
    verified: {
        type: Boolean,
        default: false, 
    },
    isLoggedIn:{
        type:Boolean,
        default:false
    },
    blocked:{
        type:Boolean,
        default:false
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'staff'], 
        default: 'user',
    }
}, { timestamps: true, versionKey: false });

export default mongoose.model('User', userSchema);
