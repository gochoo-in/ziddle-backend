import express from 'express';
import { getFlights } from './flights.controller.js';

const router = express.Router();

// Route for fetching hotels based on cityId, dates, adults, and rooms
router.get('/:departureCityId/:arrivalCityId/flights', getFlights);

export default router;