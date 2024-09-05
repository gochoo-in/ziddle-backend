import express from 'express';
import { addDestination, getAllDestinations } from './destination.controller.js';
const router = express.Router();

router.post('/destination', addDestination);
router.get('/destination', getAllDestinations)

export default router;
