import { Router } from 'express';
import { signup, verifySignup, login, verifyLogin } from './auth.controller.js';

const router = Router();
router.post('/signup', signup);
router.post('/verify-signup', verifySignup);
router.post('/login', login);
router.post('/verify-login', verifyLogin);
export default router;
