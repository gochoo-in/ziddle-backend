import mongoose from "mongoose";

const countrySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    isoCode: { type: String, required: true },
    currency: { type: String, required: true },
    mobileCode: { type: String, required: true },
  },
  { timestamps: true, versionKey: false }
);

const Country = mongoose.model("Country", countrySchema);

export default Country;
