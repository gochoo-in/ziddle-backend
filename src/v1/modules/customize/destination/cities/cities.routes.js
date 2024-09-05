import express from 'express';
import { addCity, getAllCities, addActivityToCity, removeActivityFromCity } from './cities.controller.js';

const router = express.Router();

router.post('/cities', addCity); 
router.get('/cities', getAllCities); 
router.post('/cities/add-activity', addActivityToCity); 

export default router;
