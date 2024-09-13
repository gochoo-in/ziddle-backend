import mongoose from "mongoose";

const userCookieSchema = new mongoose.Schema({
    cookieId: { type: String, default: () => new mongoose.Types.UUID() }, 
    cookieValue: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true, versionKey: false });

export default mongoose.model('UserCookie', userCookieSchema);
