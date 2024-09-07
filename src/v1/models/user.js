import mongoose from 'mongoose';

const userLoginSchema = new mongoose.Schema({
    login_time: {
        type: Date,
        default: Date.now,
    },
    ip_address: {
        type: String,
        default: 'Unknown IP',
    },
    device_type: {
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
    role: {
        type: String,
        enum: ['user', 'admin', 'staff'], 
        default: 'user',
    },
    userLogins: [userLoginSchema],
}, { timestamps: true, versionKey: false });

export default mongoose.model('User', userSchema);
