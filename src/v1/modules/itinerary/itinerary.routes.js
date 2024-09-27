import express from 'express';
import { createItinerary, getFlightsInItinerary,getItineraryDetails, getItinerariesByUserId, getTotalTripsByUsers, getHotelsInItinerary, getTransferDetails, getAllActivities,addDaysToCity,deleteDaysFromCity,addCityToItinerary, deleteCityFromItinerary,replaceActivityInItinerary,replaceFlightInItinerary,replaceHotelInItinerary,deleteItinerary  } from './itinerary.controller.js';
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
router.patch('/:itineraryId/cities/:cityIndex/delete-days', verifyToken, deleteDaysFromCity);
router.patch('/:itineraryId/cities/:cityIndex/add-days', verifyToken, addDaysToCity);
router.patch('/:itineraryId/cities/add-city', verifyToken, addCityToItinerary);
router.patch('/:itineraryId/cities/:cityIndex/delete-city', verifyToken,deleteCityFromItinerary)
router.patch('/:itineraryId/activity/:oldActivityId/replace', verifyToken, replaceActivityInItinerary);
router.patch('/:itineraryId/flight/:modeDetailsId/replace', verifyToken, replaceFlightInItinerary);
router.patch('/:itineraryId/hotel/:hotelDetailsId/replace', verifyToken, replaceHotelInItinerary)
router.delete('/:itineraryId', deleteItinerary);

export default router;   