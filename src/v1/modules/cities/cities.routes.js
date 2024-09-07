import express from 'express';
import { addCity, getAllCities, getCityWithActivities, getCityById, updateCityById, deleteCityById } from './cities.controller.js';
import cityValidation from '../../validation/cities.validation.js';
import validate from '../../../utils/validate.js';

const router = express.Router();

router.post('/', validate(cityValidation),  addCity); 
router.get('/', getAllCities); 
router.get('/:cityName/activities', getCityWithActivities);
router.get('/:cityId', getCityById);
router.patch('/:cityId',  updateCityById)
router.delete('/:cityId',  deleteCityById)

export default router;
