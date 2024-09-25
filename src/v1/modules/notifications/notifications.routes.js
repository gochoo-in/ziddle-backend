import express from 'express'
import { casbinMiddleware } from '../../../utils/casbinMiddleware.js';  
import { getNotifications } from './notifications.controller.js';

const router = express.Router();

router.get('/', casbinMiddleware, getNotifications);

export default router;