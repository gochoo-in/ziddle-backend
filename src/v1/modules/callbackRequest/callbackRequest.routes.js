import express from 'express'
import { callbackRequest } from './callbackRequest.controller.js';
import { callbackRequestValidation } from '../../validation/index.js'
import validate from '../../../utils/validate.js';

const router = express.Router();
router.post('/:userId/request-callback', validate(callbackRequestValidation), callbackRequest);
export default router;