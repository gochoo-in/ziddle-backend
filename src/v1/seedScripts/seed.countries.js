import Country from "../models/country.js";
import { countryConstants } from "../../utils/countryConstants.js"; 
import mongoose from "mongoose";
import { connectMongoDB } from "../../config/db/mongo.js";

export const seedCountries = async () => {
  try {
    if (mongoose.connection.readyState !== 1) {
        await connectMongoDB();
    }
    
    await Country.deleteMany();
    
    await Country.insertMany(countryConstants);
    console.log("Countries have been successfully seeded!");

  } catch (error) {
    console.error("Error seeding countries:", error);
  }
};

const runSeed = async () => {
  await seedCountries();
  console.log("Finished execution");

  process.exit(0);
};

runSeed();
