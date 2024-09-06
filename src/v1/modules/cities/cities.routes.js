import express from 'express';
import { addCity, getAllCities, getCityWithActivities, getCityById, updateCityById, deleteCityById } from './cities.controller.js';
import isAdmin from '../../../utils/middleware.js';


const router = express.Router();

router.post('/', isAdmin, addCity); 
router.get('/', getAllCities); 
router.get('/:cityName/activities', getCityWithActivities);
router.get('/:cityId', getCityById);
router.patch('/:cityId', isAdmin, updateCityById)
router.delete('/:cityId', isAdmin, deleteCityById)

export default router;
