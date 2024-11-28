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
  getDestinationStatistics,
  getActivityStatistics,
  updateItineraryDetails
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
  const { additionalDays, newActivityId, selectedHotel, newCity, daysToDelete, newMode } = req.body;

  try {
      if (req.method === 'PATCH') {
          const itinerary = await Itinerary.findById(itineraryId).lean();
          if (!itinerary) {
              return res.status(StatusCodes.NOT_FOUND).json(
                  httpFormatter({}, 'Itinerary not found', false)
              );
          }

          let cityName =
              cityIndex !== undefined && cityIndex >= 0
                  ? itinerary.enrichedItinerary.itinerary[cityIndex]?.currentCity || `City at index ${cityIndex}`
                  : null;

          // Handle specific operations based on the route path
          if (req.path.includes('add-days')) {
              req.comment = `Added ${additionalDays} days to ${cityName} in itinerary.`;
          } else if (req.path.includes('delete-days')) {
              req.comment = `Deleted ${daysToDelete} days from ${cityName} in itinerary.`;
          } else if (req.path.includes('delete-city')) {
              req.comment = `${cityName} deleted from itinerary.`;
          } else if (req.path.includes('add-city')) {
              req.comment = `Added city ${newCity} to itinerary.`;
          } else if (req.path.includes('replace-city')) {
              req.comment = `City at index ${cityIndex} has been replaced with ${newCity} in itinerary.`;
          } else if (req.path.includes('activity') && req.path.includes('replace')) {
              const oldActivity = await GptActivity.findById(oldActivityId);
              const newActivity = await Activity.findById(newActivityId);
              if (oldActivity && newActivity) {
                  req.comment = `${oldActivity.name} has been replaced with ${newActivity.name} in itinerary.`;
              } else {
                  return res.status(StatusCodes.NOT_FOUND).json(
                      httpFormatter({}, 'Old or new activity not found', false)
                  );
              }
          } else if (req.path.includes('activity') && req.path.includes('replaceLeisure')) {
              const oldActivity = await GptActivity.findById(oldActivityId);
              if (oldActivity) {
                  req.comment = `${oldActivity.name} has been replaced with leisure.`;
              } else {
                  return res.status(StatusCodes.NOT_FOUND).json(
                      httpFormatter({}, 'Old activity not found', false)
                  );
              }
          } else if (req.path.includes('flight') && req.path.includes('replace')) {
              req.comment = `Flight with ID ${modeDetailsId} has been replaced with a new flight in itinerary.`;
          } else if (req.path.includes('hotel') && req.path.includes('replace')) {
              req.comment = `Hotel with ID ${hotelDetailsId} has been replaced with new hotel (${selectedHotel?.name}) in itinerary.`;
          } else if (req.path.includes('transport-mode')) {
              req.comment = `Transport mode for city at index ${cityIndex} has been changed to ${newMode}.`;
          } else if (req.path.includes('update-details')) {
              const updatedFields = [];
              if (req.body.date) updatedFields.push(`Date changed to ${req.body.date}`);
              if (req.body.travelingWith) updatedFields.push(`Traveling with changed to ${req.body.travelingWith}`);
              if (req.body.rooms && Array.isArray(req.body.rooms)) {
                  const roomDetails = req.body.rooms.map((room, index) => {
                      const adults = room.adults || 0;
                      const children = room.children || 0;
                      const childrenAges = room.childrenAges?.join(', ') || 'N/A';
                      return `Room ${index + 1}: ${adults} adults, ${children} children (Ages: ${childrenAges})`;
                  });
                  updatedFields.push(`Rooms updated: ${roomDetails.join('; ')}`);
              }
              req.comment = updatedFields.length
                  ? `Updated itinerary details: ${updatedFields.join(', ')}.`
                  : null;
          }
      }

      next();
  } catch (error) {
      console.error(error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
          httpFormatter({}, 'Internal server error', false)
      );
  }
};

// Define all routes
router.post('/', verifyToken, createItinerary);
router.get('/user/:userId', verifyToken, getItinerariesByUserId);
router.get('/all', verifyToken, getAllItineraries);
router.get('/statistics', verifyToken, getAllUsersStatistics);
router.get('/destination-statistics', verifyToken, getDestinationStatistics);
router.get('/activity-statistics', verifyToken, getActivityStatistics);
router.get('/total-trips', verifyToken, getTotalTripsByUsers);
router.get('/:itineraryId', verifyToken, getItineraryDetails);
router.get('/:itineraryId/flights', verifyToken, getFlightsInItinerary);
router.get('/:itineraryId/hotels', verifyToken, getHotelsInItinerary);
router.get('/:itineraryId/transfer', verifyToken, getTransferDetails);
router.get('/:itineraryId/activities', verifyToken, getAllActivities);
router.get('/:historyId/history-activities', casbinMiddleware, getAllActivitiesForHistory);
router.patch('/:itineraryId/update-details', verifyToken, updateItineraryDetails);
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
