import express from 'express';
import { createItinerary } from './itinerary.controller.js';

const router = express.Router();

router.post('/createItinerary', createItinerary);

export default router;
