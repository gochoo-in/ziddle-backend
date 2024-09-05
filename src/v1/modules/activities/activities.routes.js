import express from 'express';
import { addActivity, getActivitiesByCity } from './activities.controller.js';

const router = express.Router();

router.post('/', addActivity); 
router.get('/:cityName', getActivitiesByCity); 

export default router;
