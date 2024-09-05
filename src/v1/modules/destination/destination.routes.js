import express from 'express';
import { addDestination, getAllDestinations, getActivitiesByDestination, getCitiesByDestination } from './destination.controller.js'; 
const router = express.Router();

router.post('/', addDestination);
router.get('/', getAllDestinations);
router.get('/:destinationId/activities', getActivitiesByDestination);
router.get('/:destinationId/cities', getCitiesByDestination);
export default router;
