// import mongoose from 'mongoose';
// import bcrypt from 'bcrypt';



// const C = new mongoose.Schema({
//   _id: { type: String, required: true },
//   seq: { type: Number, default: 0 }
// });

// const Counter = mongoose.model('Counter', counterSchema);


// const employeeSchema = new mongoose.Schema({
//   name: {
//     type: String,
//     required: true,
//     trim: true,
//     minlength: 2,
//   },
//   email: {
//     type: String,
//     required: true,
//     unique: true,
//     lowercase: true,
//     trim: true,
//     match: /^\S+@\S+\.\S+$/,
//   },
//   phone: {
//     type: String,
//     required: true,
//     trim: true,
//     minlength: 10,
//     maxlength: 15,
//     match: /^[0-9]+$/,  // This ensures the phone number contains only digits
//   },
//   password: {
//     type: String,
//     required: true,
//     minlength: 8,
//     select: false,
//   },
//   isLoggedIn: {
//     type: Boolean,
//     default: false,
//   },
//   uniqueSmallId: {
//     type: String,
//     unique: true,
//   },
//   blocked: {
//     type: Boolean,
//     default: false,
//   }
// }, {
//   timestamps: true,
//   versionKey: false,
// });

// employeeSchema.pre('save', async function(next) {
//   if (!this.isModified('password')) {
//     return next();
//   }
//   if(this.isModeified('password'))
//     {
//   const salt = await bcrypt.genSalt(10);
//   this.password = await bcrypt.hash(this.password, salt);}
//   next();


// });

// employeeSchema.methods.comparePassword = async function(candidatePassword) {
//   return bcrypt.compare(candidatePassword, this.password);
// };

// export default mongoose.model('Employee', employeeSchema);
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

// Define the Counter schema
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

// Check if the 'Counter' model is already defined, and reuse it if it exists
const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

// Define the Employee schema
const employeeSchema = new mongoose.Schema({
  uniqueSmallId: {
    type: String,
    unique: true,
  },
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
    match: /^\S+@\S+\.\S+$/, // Valid email format
  },
  phone: {
    type: String,
    required: true,
    trim: true,
    minlength: 10,
    maxlength: 15,
    match: /^[0-9]+$/, // Ensures phone number contains only digits
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false, // Password will not be returned in queries by default
  },
  isLoggedIn: {
    type: Boolean,
    default: false,
  },
  blocked: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt fields
  versionKey: false, // Disables the versionKey field (_v)
});

// Pre-save hook to hash the password and generate the uniqueSmallId
employeeSchema.pre('save', async function (next) {
  try {
    // Hash the password if it's modified
    if (this.isModified('password')) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }

    // Generate the uniqueSmallId if this is a new employee
    if (this.isNew) {
      const counter = await Counter.findByIdAndUpdate(
        { _id: 'employee' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }  // Create a new counter if it doesn't exist
      );
      const sequenceNumber = String(counter.seq).padStart(5, '0'); // Pad to get a 5-digit number
      this.uniqueSmallId = `E${sequenceNumber}`;
    }

    next();
  } catch (err) {
    next(err);
  }
});

// Method to compare passwords during login
employeeSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Check if the Employee model is already defined, and reuse it if it exists
const Employee = mongoose.models.Employee || mongoose.model('Employee', employeeSchema);

export default Employee;
