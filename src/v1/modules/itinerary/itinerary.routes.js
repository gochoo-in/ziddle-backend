import express from 'express';
import { createItinerary, getFlightsInItinerary,getItineraryDetails, getItinerariesByUserId, getTotalTripsByUsers, getHotelsInItinerary, getTransferDetails, getAllActivities,addDaysToCity,deleteDaysFromCity,addCityToItinerary, deleteCityFromItinerary,replaceActivityInItinerary,replaceFlightInItinerary,replaceHotelInItinerary  } from './itinerary.controller.js';
import { verifyToken } from '../../../utils/token.js';
const router = express.Router();

router.post('/',verifyToken, createItinerary);
router.get('/user/:userId', verifyToken, getItinerariesByUserId);
router.get('/total-trips', verifyToken, getTotalTripsByUsers);
router.get('/:itineraryId',getItineraryDetails);
router.get('/:itineraryId/flights',getFlightsInItinerary);
router.get('/:itineraryId/hotels',getHotelsInItinerary);
router.get('/:itineraryId/transfer',getTransferDetails);
router.get('/:itineraryId/activities', getAllActivities);
router.patch('/:itineraryId/cities/:cityIndex/delete-days', deleteDaysFromCity);
router.patch('/:itineraryId/cities/:cityIndex/add-days', addDaysToCity);
router.patch('/:itineraryId/cities/add-city', addCityToItinerary);
router.patch('/:itineraryId/cities/:cityIndex/delete-city',deleteCityFromItinerary)
router.patch('/:itineraryId/activity/:oldActivityId/replace', replaceActivityInItinerary);
router.patch('/:itineraryId/flight/:modeDetailsId/replace', replaceFlightInItinerary);
router.patch('/:itineraryId/hotel/:hotelDetailsId/replace',replaceHotelInItinerary)

export default router;   