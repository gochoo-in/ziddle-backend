import express from 'express'
import { contactSupport } from './contactUs.controller.js';
import validate from '../../../utils/validate.js';
import contactUsValidation from '../../validation/contactUs.validation.js';

const router = express.Router();
router.post('/', validate(contactUsValidation), contactSupport)

export default router;