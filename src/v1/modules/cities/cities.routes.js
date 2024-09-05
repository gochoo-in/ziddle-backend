import express from 'express';
import { addCity, getAllCities, getCityWithActivities } from './cities.controller.js';

const router = express.Router();

router.post('/', addCity); 
router.get('/', getAllCities); 
router.get('/:cityName/activities', getCityWithActivities);

export default router;
