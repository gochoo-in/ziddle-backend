import express from 'express';
import { addCity, getAllCities, getCityWithActivities, getCityById, updateCityById, deleteCityById, getActivitiesForMultipleCities, toggleCityActiveStatus } from './cities.controller.js';
import cityValidation from '../../validation/cities.validation.js';
import validate from '../../../utils/validate.js';
import { casbinMiddleware } from '../../../utils/casbinMiddleware.js'

const router = express.Router();

router.post('/', casbinMiddleware,  addCity); 
router.get('/', getAllCities); 
router.get('/activities', getActivitiesForMultipleCities); 
router.get('/:cityId/activities', getCityWithActivities);
router.get('/:cityId', getCityById);
router.patch('/:id/toggle-city-active',toggleCityActiveStatus)
router.patch('/:cityId', casbinMiddleware,  updateCityById)
router.delete('/:cityId', casbinMiddleware,  deleteCityById)
export default router;
  