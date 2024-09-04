import mongoose from "mongoose";
import City from "./city";
import Country from "./country";
import User from './user'
const ActivitySchema = new mongoose.Schema({
    name: { type: String, required: true },
    duration: { type: String, required: true },
    category: { type: String, required: true },
    opensAt: { type: String, required: true },
    closesAt: { type: String, required: true }
  });
  
export default mongoose.model('Activity',ActivitySchema)