import express from 'express';
import { getTopHotels } from './hotels.controller.js';

const router = express.Router();

router.get('/:cityId/hotels', getTopHotels);

export default router;
