import mongoose from "mongoose";
import City from "./city";
import Country from "./country";
import User from './user'
const ActivitySchema = new mongoose.Schema({
    name: { type: String, required: true },
    duration: { type: String, required: true },
    activity_type: { type: String, required: true },
    opens_at: { type: String, required: true },
    closed_at: { type: String, required: true }
  });
  
export default mongoose.model('Activity',ActivitySchema)