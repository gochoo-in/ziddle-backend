import express from 'express';
import validate from '../../../utils/validate.js';
// import  itineraryValidation  from '../../validation/itinerary.validation.js';

import  {itineraryValidation}  from '../../validation/index.js'
import { createItinerary } from './itinerary.controller.js';

const router = express.Router();

router.post('/createItinerary', validate(itineraryValidation), createItinerary);

export default router;   
