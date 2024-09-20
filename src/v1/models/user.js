import mongoose from 'mongoose';

const userLoginSchema = new mongoose.Schema({
    loginTime: {
        type: Date,
        default: Date.now,
    },
    ipAddress: {
        type: String,
        default: 'Unknown IP',
    },
    deviceType: {
        type: String,
        default: 'Unknown device',
    },
    browser: {
        type: String,
        default: 'Unknown browser',
    },
    os: {
        type: String,
        default: 'Unknown OS',
    }
}, { _id: false });

const userSchema = new mongoose.Schema({
    phoneNumber: {
        type: String, 
        required: true,
        unique: true,
    },
    firstName: { 
        type: String, 
        required: true 
    },     
    lastName: { 
        type: String, 
        required: true 
    },   
    email: { 
        type: String, 
        required: true, 
        unique: true 
    },     
    otp: {
        type: String,
    },
    otpExpires: {
        type: Date,
    },
    otpVerifiedAt: {
        type: Date,
    },
    verified: {
        type: Boolean,
        default: false, 
    },
    isLoggedIn: {
        type: Boolean,
        default: false,
    },
    blocked: {
        type: Boolean,
        default: false,
    },
    userLogins: [userLoginSchema],
}, { timestamps: true, versionKey: false });

export default mongoose.model('User', userSchema);
