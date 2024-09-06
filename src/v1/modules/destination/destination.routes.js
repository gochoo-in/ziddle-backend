import express from 'express';
import { addDestination, getAllDestinations, getActivitiesByDestination, getCitiesByDestination, updateDestination, deleteDestination, getDestinationById } from './destination.controller.js'; 
import isAdmin from '../../../utils/middleware.js';
const router = express.Router();

router.post('/', isAdmin, addDestination);
router.get('/', getAllDestinations);
router.get('/:destinationId', getDestinationById);
router.get('/:destinationId/activities', getActivitiesByDestination);
router.get('/:destinationId/cities', getCitiesByDestination);
router.patch('/:destinationId', isAdmin, updateDestination);
router.delete('/:destinationId', isAdmin, deleteDestination);
export default router;
