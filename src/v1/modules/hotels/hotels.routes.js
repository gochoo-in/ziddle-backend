import express from 'express';
import { getTopHotels,getSpecificHotelDetails } from './hotels.controller.js';

const router = express.Router();

router.get('/:cityId/hotels', getTopHotels);

router.get('/:cityId/hotels/:hotelCode',getSpecificHotelDetails)

export default router;
