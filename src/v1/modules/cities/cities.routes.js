import express from 'express';
import { addCity, getAllCities, addActivityToCity, removeActivityFromCity } from './cities.controller.js';

const router = express.Router();

router.post('/', addCity); 
router.get('/', getAllCities); 
router.post('/add-activity', addActivityToCity); 

export default router;
