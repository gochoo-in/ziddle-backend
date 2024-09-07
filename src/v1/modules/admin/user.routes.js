import express from 'express'
import { getAllUsers } from './user.controller.js';

const router = express.Router();
router.get('/users',getAllUsers);

export default router;