import express from 'express';
import { getHotels } from './hotels.controller.js';

const router = express.Router();

// Route for fetching hotels based on cityId, dates, adults, and rooms
router.get('/:cityId/hotels', getHotels);

export default router;