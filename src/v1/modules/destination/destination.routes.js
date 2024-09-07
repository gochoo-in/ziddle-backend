import express from 'express';
import { addDestination, getAllDestinations, getActivitiesByDestination, getCitiesByDestination, updateDestination, deleteDestination, getDestinationById } from './destination.controller.js'; 
import validate from '../../../utils/validate.js';
import { destinationValidation } from '../../validation/index.js';
const router = express.Router();

router.post('/', validate(destinationValidation),addDestination);
router.get('/', getAllDestinations);
router.get('/:destinationId', getDestinationById);
router.get('/:destinationId/activities', getActivitiesByDestination);
router.get('/:destinationId/cities', getCitiesByDestination);
router.patch('/:destinationId',updateDestination);
router.delete('/:destinationId',  deleteDestination);
export default router;
