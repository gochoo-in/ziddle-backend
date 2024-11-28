import express from 'express';
import { getAllCountries, addCountry, updateCountry, deleteCountry } from './countries.controller.js';
import { casbinMiddleware } from '../../../utils/casbinMiddleware.js';

const router = express.Router();

router.get('/', getAllCountries);

router.post('/', casbinMiddleware,  addCountry);

router.patch('/:id', casbinMiddleware, updateCountry);

router.delete('/:id', casbinMiddleware, deleteCountry);

export default router;
