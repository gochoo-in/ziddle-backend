import express from 'express';
import {
  createItinerary,
  getFlightsInItinerary,
  getItineraryDetails,
  getItinerariesByUserId,
  getTotalTripsByUsers,
  getHotelsInItinerary,
  getTransferDetails,
  getAllActivities,
  addDaysToCity,
  deleteDaysFromCity,
  addCityToItineraryAtPosition,
  deleteCityFromItinerary,
  replaceActivityInItinerary,
  replaceFlightInItinerary,
  replaceHotelInItinerary,
  deleteItinerary,
  getItineraryHistories,
  getFullItineraryWithHistories,
  replaceCityInItinerary,
  getItineraryHistoryById,
  getAllActivitiesForHistory,
  changeTransportModeInCity, 
  deleteActivityInItinerary,
  addGeneralCoupon,
  getAllItineraries,
  getAllUsersStatistics,
  getDestinationStatistics
} from './itinerary.controller.js';
import { verifyToken } from '../../../utils/token.js';
import { StatusCodes } from 'http-status-codes';
import Itinerary from '../../models/itinerary.js';
import Hotel from '../../models/hotel.js';
import httpFormatter from '../../../utils/formatter.js';
import GptActivity from '../../models/gptactivity.js';
import Activity from '../../models/activity.js';
import { casbinMiddleware } from '../../../utils/casbinMiddleware.js';

const router = express.Router();

const addUpdateComment = async (req, res, next) => {
  const { itineraryId, cityIndex, oldActivityId, hotelDetailsId, modeDetailsId } = req.params;
  const { additionalDays, newActivityId, selectedHotel, selectedFlight, newCity, stayDays, daysToDelete } = req.body;

  try {
    if (req.method === 'PATCH') {
      const itinerary = await Itinerary.findById(itineraryId).lean();
      if (!itinerary) {
        return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Itinerary not found', false));
      }

      if (cityIndex !== undefined && cityIndex >= 0) {
        const cityName = itinerary.enrichedItinerary.itinerary[cityIndex]?.currentCity || `City at index ${cityIndex}`;

        if (req.path.includes('add-days')) {
          req.comment = `Added ${additionalDays} days to ${cityName} in itinerary.`;
        } else if (req.path.includes('delete-days')) {
          req.comment = `Deleted ${daysToDelete} days from ${cityName} in itinerary.`;
        } else if (req.path.includes('delete-city')) {
          req.comment = `${cityName} deleted from itinerary.`;
        }
      }

      if (req.path.includes('add-city')) {
        req.comment = `Added city ${newCity} in itinerary.`;
      } else if (req.path.includes('activity') && req.path.includes('replace')) {
        const oldActivity = await GptActivity.findById(oldActivityId);
        const newActivity = await Activity.findById(newActivityId);
        if (oldActivity && newActivity) {
          req.comment = `${oldActivity.name} has been replaced with ${newActivity.name} in itinerary.`;
        } else if (!oldActivity) {
          return res.status(StatusCodes.NOT_FOUND).json({ message: 'Old activity not found' });
        } else if (!newActivity) {
          return res.status(StatusCodes.NOT_FOUND).json({ message: 'Old or new activity not found' });
        }
      } else if (req.path.includes('flight') && req.path.includes('replace')) {
        req.comment = `Flight with ID ${modeDetailsId} has been replaced with a new flight in itinerary.`;
      } else if (req.path.includes('hotel') && req.path.includes('replace')) {
        req.comment = `Hotel with ID ${hotelDetailsId} has been replaced with new hotel (${selectedHotel.name}) in itinerary.`;
      } else if (req.path.includes('replace-city')) {
        req.comment = `City at index ${cityIndex} has been replaced with ${newCity} in itinerary.`;
      } else if (req.path.includes('transport-mode')) { // New comment for changing transport mode
        req.comment = `Transport mode for city at index ${cityIndex} has been changed to ${req.body.newMode}.`;
      }
    }
    next();
  } catch (error) {
    console.error(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error', error: error.message });
  }
};

// Define all routes
router.post('/', verifyToken, createItinerary);
router.get('/user/:userId', verifyToken, getItinerariesByUserId);
router.get('/all', verifyToken, getAllItineraries);
router.get('/statistics', verifyToken, getAllUsersStatistics);
router.get('/destination-statistics', verifyToken, getDestinationStatistics);
router.get('/total-trips', verifyToken, getTotalTripsByUsers);
router.get('/:itineraryId', getItineraryDetails);
router.get('/:itineraryId/flights', getFlightsInItinerary);
router.get('/:itineraryId/hotels', getHotelsInItinerary);
router.get('/:itineraryId/transfer', getTransferDetails);
router.get('/:itineraryId/activities', getAllActivities);
router.get('/:historyId/history-activities', getAllActivitiesForHistory);
router.patch('/:itineraryId/cities/:cityIndex/delete-days', verifyToken, addUpdateComment, deleteDaysFromCity);
router.patch('/:itineraryId/cities/:cityIndex/add-days', verifyToken, addUpdateComment, addDaysToCity);
router.patch('/:itineraryId/cities/add-city', verifyToken, addUpdateComment, addCityToItineraryAtPosition);
router.patch('/:itineraryId/cities/:cityIndex/delete-city', verifyToken, addUpdateComment, deleteCityFromItinerary);
router.patch('/:itineraryId/cities/:cityIndex/replace-city', verifyToken, addUpdateComment, replaceCityInItinerary);
router.patch('/:itineraryId/activity/:oldActivityId/replace', verifyToken, addUpdateComment, replaceActivityInItinerary);
router.patch('/:itineraryId/flight/:modeDetailsId/replace', verifyToken, addUpdateComment, replaceFlightInItinerary);
router.patch('/:itineraryId/hotel/:hotelDetailsId/replace', verifyToken, addUpdateComment, replaceHotelInItinerary);
router.patch('/:itineraryId/cities/:cityIndex/transport-mode', verifyToken, addUpdateComment, changeTransportModeInCity); // New endpoint
router.get('/:itineraryId/full-histories', casbinMiddleware, getFullItineraryWithHistories);
router.get('/:itineraryId/histories', casbinMiddleware, getItineraryHistories);
router.get("/:itineraryId/history/:historyId", casbinMiddleware, getItineraryHistoryById);
router.patch("/:itineraryId/addCoupon/:discountId", verifyToken, addGeneralCoupon )


router.patch('/:itineraryId/activity/:oldActivityId/replaceLeisure', verifyToken, deleteActivityInItinerary);

router.delete('/:itineraryId', deleteItinerary);

export default router;
