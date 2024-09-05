import express from 'express';
import { addDestination, getAllDestinations, getActivitiesByDestination } from './destination.controller.js'; 
const router = express.Router();

router.post('/', addDestination);
router.get('/', getAllDestinations);
router.get('/:destinationId/activities', getActivitiesByDestination);

export default router;
