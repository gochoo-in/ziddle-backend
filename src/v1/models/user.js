import mongoose from 'mongoose';

// Counter schema for generating unique IDs
const counterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
});

// Counter model (reuse if already defined)
const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

// User schema
const userSchema = new mongoose.Schema({
    phoneNumber: {
        type: String,
        required: true,
        unique: true,
    },
    firstName: {
        type: String,
        required: true,
    },
    lastName: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
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
    uniqueSmallId: {
        type: String,
        unique: true,
    },
}, { timestamps: true, versionKey: false });

// Pre-save hook to generate uniqueSmallId
userSchema.pre('save', async function (next) {
    if (this.isNew) {
        try {
            const counter = await Counter.findByIdAndUpdate(
                { _id: 'user' },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );

            const sequenceNumber = String(counter.seq).padStart(5, '0'); // Pad with zeros to make it 5 digits
            this.uniqueSmallId = `U${sequenceNumber}`;
            next();
        } catch (err) {
            next(err);
        }
    } else {
        next();
    }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
