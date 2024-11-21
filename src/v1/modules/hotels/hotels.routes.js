import express from 'express';
import { getTopHotels,getSpecificHotelDetails, getCityName } from './hotels.controller.js';

const router = express.Router();

router.get('/:cityId/hotels', getTopHotels);

router.get('/:cityId/hotels/:hotelCode',getSpecificHotelDetails)

router.post('/hotelCityNames', getCityName)

export default router;
