import express from 'express';
import { createItinerary, getFlightsInItinerary,getItineraryDetails,getHotelsInItinerary, getTransferDetails } from './itinerary.controller.js';
import { verifyToken } from '../../../utils/token.js';
const router = express.Router();

router.post('/',verifyToken, createItinerary);
router.get('/:itineraryId',getItineraryDetails);
router.get('/:itineraryId/flights',getFlightsInItinerary);
router.get('/:itineraryId/hotels',getHotelsInItinerary);
router.get('/:itineraryId/transfer',getTransferDetails)

export default router;   
