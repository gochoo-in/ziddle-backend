import express from 'express';
import { getAllInternationalAirportCities, addInternationalAirportCity, updateInternationalAirportCity, deleteInternationalAirportCity } from './internationalAirportCities.controller.js';
import { casbinMiddleware } from '../../../utils/casbinMiddleware.js';

const router = express.Router();

// GET all Indian cities
router.get('/', getAllInternationalAirportCities);

// POST a new Indian city
router.post('/',  addInternationalAirportCity);

// PATCH to update an Indian city
router.patch('/:id', casbinMiddleware, updateInternationalAirportCity);

// DELETE an Indian city
router.delete('/:id', casbinMiddleware, deleteInternationalAirportCity);

export default router;
