import mongoose from 'mongoose'

const savedContactSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    salutation: { type: String, enum: ['Mr.', 'Mrs.', 'Ms.'], required: true },
    firstName: { type: String, required: true },
    surname: { type: String },
    dob: { type: Date },
    passport: {
        passportNumber: { type: String, required: true },
        expiryDate: { type: Date, required: true }
    }
}, { timestamps: true, versionKey: false });

export default mongoose.model('SavedContact', savedContactSchema); 