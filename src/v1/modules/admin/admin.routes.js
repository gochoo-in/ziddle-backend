import express from 'express';
import { adminSignup, adminSignin, adminLogout, deleteEmployee } from './admin.controller.js';
import { verifyToken } from '../../../utils/token.js';
import { casbinMiddleware } from '../../../utils/casbinMiddleware.js'
const router = express.Router();

router.post('/signup', adminSignup);
router.post('/signin', adminSignin);
router.post('/logout', verifyToken, adminLogout);
router.delete('/:id', casbinMiddleware, deleteEmployee)

export default router;
