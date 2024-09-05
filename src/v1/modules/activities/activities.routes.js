import express from 'express';
import { addActivity } from './activities.controller.js';

const router = express.Router();

router.post('/', addActivity); 

export default router;
