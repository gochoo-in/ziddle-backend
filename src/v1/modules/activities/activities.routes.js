import express from 'express';
import { addActivity, getActivitiesByCity } from './activities.controller.js';

const router = express.Router();

router.post('/', addActivity); 
router.get('/city/:cityName', getActivitiesByCity);

export default router;
