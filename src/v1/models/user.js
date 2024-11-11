import mongoose from 'mongoose';



const counterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
  });
  
  // Check if the 'Counter' model is already defined, and reuse it if it exists
  const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

const userLoginSchema = new mongoose.Schema({
    loginTime: {
        type: Date,
        default: Date.now,
    },
    smallId: {
        type: String,
        unique: true,
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
    referralCode: {
        type: String,
        unique: true,
        required: true,
    },
    userLogins: [userLoginSchema],
}, { timestamps: true, versionKey: false });



userSchema.pre('save', async function (next) {
    if (this.isNew) {
        try {
            // Find and increment the counter for 'activity' collection
            const counter = await Counter.findByIdAndUpdate(
                { _id: 'user' },  // Using 'activity' as the counter ID
                { $inc: { seq: 1 } },
                { new: true, upsert: true }  // Upsert in case counter doesn't exist
            );

            // Generate the smallId in the format 'A00001'
            const sequenceNumber = String(counter.seq).padStart(5, '0');  // Pad with zeros to get 5 digits
            this.smallId = `U${sequenceNumber}`;

            next();
        } catch (err) {
            next(err);
        }
    } else {
        next();
    }
});


export default mongoose.model('User', userSchema);
