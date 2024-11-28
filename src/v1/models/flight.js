import mongoose from "mongoose";

const flightSchema = new mongoose.Schema({
    departureCityId: { 
        type: mongoose.Schema.Types.ObjectId, 
        refPath: 'cityModelType', 
        required: [true, 'Departure city ID is required'] 
    },
    arrivalCityId: { 
        type: mongoose.Schema.Types.ObjectId, 
        refPath: 'cityModelType', 
        required: [true, 'Arrival city ID is required'] 
    },
    cityModelType: { 
        type: String, 
        enum: ['City', 'InternationalAirportCity'], 
        default: 'City',
        required: [true, 'City model type is required'] 
    },
    baggageIncluded: { 
        type: Boolean, 
        required: [true, 'Baggage inclusion status is required'] 
    },
    baggageDetails: {
        cabinBag: { type: String, default: "N/A" },
        checkedBag: { type: String, default: "N/A" }
    },
    price: { type: Number, required: [true, 'Price is required'] },
    currency: { type: String, required: [true, 'Currency is required'] },
    airline: { type: String, required: [true, 'Airline name is required'] },
    departureDate: { type: Date, required: [true, 'Departure date is required'] },
    flightSegments: [{
        img: { type: String, default: null },
        departureTime: { type: Date, required: [true, 'Segment departure time is required'] },
        arrivalTime: { type: Date, required: [true, 'Segment arrival time is required'] },
        flightNumber: { type: String, required: [true, 'Flight number is required'] }
    }]
}, { timestamps: true, versionKey: false });

export default mongoose.model('Flight', flightSchema);
