import express from 'express';
import { addSettings, getSettings, updateSettings } from './settings.controller.js';
import { casbinMiddleware } from '../../../utils/casbinMiddleware.js';

const router = express.Router();
router.post('/', casbinMiddleware, addSettings);

router.patch('/:id', casbinMiddleware, updateSettings); 

router.get('/', getSettings);

export default router;