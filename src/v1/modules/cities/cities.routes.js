import express from 'express';
import { addCity, getAllCities, getCityWithActivities, getCityById, updateCityById, deleteCityById } from './cities.controller.js';
import isAdmin from '../../../utils/middleware.js';
import cityValidation from '../../validation/cities.validation.js';
import validate from '../../../utils/validate.js';

const router = express.Router();

router.post('/', validate(cityValidation), isAdmin, addCity); 
router.get('/', getAllCities); 
router.get('/:cityName/activities', getCityWithActivities);
router.get('/:cityId', getCityById);
router.patch('/:cityId', isAdmin, updateCityById)
router.delete('/:cityId', isAdmin, deleteCityById)

export default router;
