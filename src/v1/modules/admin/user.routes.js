import express from 'express'
import { updateUserRole } from './user.controller.js';
import isAdmin from '../../../utils/middleware.js';

const router = express.Router();
router.patch('/:userId', isAdmin, updateUserRole);
export default router;