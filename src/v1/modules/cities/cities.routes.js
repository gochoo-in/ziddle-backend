import express from 'express';
import { addCity, getAllCities, getCityWithActivities, getCityById, updateCityById, deleteCityById } from './cities.controller.js';


const router = express.Router();

router.post('/', addCity); 
router.get('/', getAllCities); 
router.get('/:cityName/activities', getCityWithActivities);
router.get('/:cityId', getCityById);
router.patch('/:cityId', updateCityById)
router.delete('/:cityId', deleteCityById)

export default router;
