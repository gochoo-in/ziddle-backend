import mongoose from "mongoose";
import Country from "./country";

const TravelerSchema = new mongoose.Schema({
    salutation: { type: String, enum: ['Mr.', 'Ms.', 'Mrs.', 'Dr.'], required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    passportNumber: { type: String, required: true },
    passportIssueDate: { type: Date },
    passportExpiryDate: { type: Date, required: true },
    passportIssueCity: { type: String },
    passportIssueCountry: { type: mongoose.Schema.Types.ObjectId, ref: 'Country', required: true },
    PAN: { type: String },
    documents: [{ type: String}],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  });
  

  export default mongoose.model('Traveler',TravelerSchema)