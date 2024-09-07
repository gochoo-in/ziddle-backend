import express from 'express'
import { updateUserRole, getAllUsers } from './user.controller.js';
import isAdmin from '../../../utils/middleware.js';

const router = express.Router();
router.patch('/:userId', isAdmin, updateUserRole);
router.get('/users', isAdmin, getAllUsers);

export default router;