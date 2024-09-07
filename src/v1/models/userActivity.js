import mongoose from 'mongoose';

const userActivitySchema = new mongoose.Schema({
    cookieId: { type: mongoose.Schema.Types.UUID, ref: 'UserCookie', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    page: { type: String, required: true },
    action: { type: String, required: true },
    deviceType: { type: String },
    browser: { type: String },
    ipAddress: { type: String },
    location: { type: String },
    os: { type: String }
}, { timestamps: true, versionKey: false });

const UserActivity = mongoose.model('UserActivity', userActivitySchema);
export default UserActivity;
