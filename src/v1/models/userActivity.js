import mongoose from 'mongoose';

const userActivitySchema = new mongoose.Schema({
    cookie_id: { type: mongoose.Schema.Types.UUID, ref: 'UserCookie', required:true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    page: { type: String, required: true },
    action: { type: String, required: true },
    device_type: { type: String },
    browser: { type: String },
    ip_address: { type: String },
    location: { type: String },
    os: { type: String },
},{timestamps:true,versionKey:false});

const UserActivity = mongoose.model('UserActivity', userActivitySchema);
export default UserActivity;
