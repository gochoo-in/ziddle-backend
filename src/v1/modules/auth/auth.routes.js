import express from 'express';
import validate from '../../../utils/validate.js';
import { authValidation } from '../../validation/index.js';
import { signup, signin, logout } from './auth.controller.js';
import { verifyToken } from '../../../utils/token.js';

const router = express.Router();

router.post('/signup', validate(authValidation.signupValidation), signup);
router.post('/signin', validate(authValidation.signinValidation), signin);
router.post('/logout', verifyToken, logout); 

export default router;
