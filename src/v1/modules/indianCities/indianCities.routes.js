import express from 'express';
import { getAllIndianCities, addIndianCity, updateIndianCity, deleteIndianCity } from './indianCities.controller.js';
import { casbinMiddleware } from '../../../utils/casbinMiddleware.js';

const router = express.Router();

// GET all Indian cities
router.get('/', getAllIndianCities);

// POST a new Indian city
router.post('/', casbinMiddleware, addIndianCity);

// PATCH to update an Indian city
router.patch('/:id', casbinMiddleware, updateIndianCity);

// DELETE an Indian city
router.delete('/:id', casbinMiddleware, deleteIndianCity);

export default router;
