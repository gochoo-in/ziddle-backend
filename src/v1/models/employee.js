import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const employeeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^\S+@\S+\.\S+$/,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
    minlength: 10,
    maxlength: 15,
    match: /^[0-9]+$/,  // This ensures the phone number contains only digits
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false,
  },
  isLoggedIn: {
    type: Boolean,
    default: false,
  },
  blocked: {
    type: Boolean,
    default: false,
  }
}, {
  timestamps: true,
  versionKey: false,
});

employeeSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

employeeSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('Employee', employeeSchema);
