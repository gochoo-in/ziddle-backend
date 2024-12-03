import express from 'express';
import { getAllInternationalAirportCities, addInternationalAirportCity, getAllIndianCities, updateInternationalAirportCity, deleteInternationalAirportCity, getCitiesByCountry, getCityById } from './internationalAirportCities.controller.js';
import { casbinMiddleware } from '../../../utils/casbinMiddleware.js';

const router = express.Router();

// GET all cities
router.get('/', getAllInternationalAirportCities);

router.get('/:cityId', getCityById);

// GET all indian cities
router.get('/indiancities', getAllIndianCities)

// GET all cities with country's id
router.get('/:countryId', getCitiesByCountry);

// POST a new Indian city
router.post('/',  casbinMiddleware, addInternationalAirportCity);

// PATCH to update an Indian city
router.patch('/:id', casbinMiddleware, updateInternationalAirportCity);

// DELETE an Indian city
router.delete('/:id', casbinMiddleware, deleteInternationalAirportCity);

export default router;
