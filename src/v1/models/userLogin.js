import mongoose from 'mongoose';

// UserLogin schema
const userLoginSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
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
    },
}, { timestamps: true, versionKey: false });

// UserLogin model
const UserLogin = mongoose.models.UserLogin || mongoose.model('UserLogin', userLoginSchema);

export default UserLogin;
