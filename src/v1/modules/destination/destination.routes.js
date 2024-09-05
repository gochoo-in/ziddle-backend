import express from 'express';
import { addDestination, getAllDestinations, getActivitiesByDestination, getCitiesByDestination, updateDestination, deleteDestination, getDestinationById } from './destination.controller.js'; 
const router = express.Router();

router.post('/', addDestination);
router.get('/', getAllDestinations);
router.get('/:destinationId', getDestinationById);
router.get('/:destinationId/activities', getActivitiesByDestination);
router.get('/:destinationId/cities', getCitiesByDestination);
router.patch('/:destinationId', updateDestination);
router.delete('/:destinationId', deleteDestination);
export default router;
