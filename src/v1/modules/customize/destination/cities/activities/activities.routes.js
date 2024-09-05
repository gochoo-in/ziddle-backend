import express from 'express';
import { addActivity, getActivitiesByCity } from './activities.controller.js';

const router = express.Router();

router.post('/activities', addActivity); 
router.get('/activities/:cityName', getActivitiesByCity); 

export default router;
