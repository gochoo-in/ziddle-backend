import express from 'express';
import { adminSignup, adminSignin, adminLogout } from './admin.controller.js';
import { verifyToken } from '../../../utils/token.js';

const router = express.Router();

router.post('/signup', adminSignup);
router.post('/signin', adminSignin);
router.post('/logout', verifyToken, adminLogout);

export default router;
