import express from 'express'
import { contactSupport } from './contactUs.controller.js';

const router = express.Router();
router.post('/', contactSupport)

export default router;