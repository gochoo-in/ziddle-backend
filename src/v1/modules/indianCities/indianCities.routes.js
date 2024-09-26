import express from 'express';
import { getAllIndianCities, addIndianCity, updateIndianCity, deleteIndianCity } from '../controllers/indianCityController.js';

const router = express.Router();

// GET all Indian cities
router.get('/', getAllIndianCities);

// POST a new Indian city
router.post('/', addIndianCity);

// PATCH to update an Indian city
router.patch('/:id', updateIndianCity);

// DELETE an Indian city
router.delete('/:id', deleteIndianCity);

export default router;
