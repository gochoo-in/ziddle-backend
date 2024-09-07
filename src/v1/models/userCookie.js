import mongoose from "mongoose";

const userCookieSchema = new mongoose.Schema({
    cookie_id: { type: String, default: () => new mongoose.Types.ObjectId() }, 
    cookie_value: { type: String, required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

},{timestamps:true,versionKey:false});
export default mongoose.model('UserCookie', userCookieSchema);
