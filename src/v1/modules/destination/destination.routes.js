import express from 'express';
import { addDestination, getAllDestinations } from './destination.controller.js';
const router = express.Router();

router.post('/', addDestination);
router.get('/', getAllDestinations)

export default router;
