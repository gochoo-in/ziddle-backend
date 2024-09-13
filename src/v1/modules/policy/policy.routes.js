import express from 'express';
import { assignAccess, getPolicies, updatePolicy, deletePolicy } from './policy.controller.js';
import { casbinMiddleware } from '../../../utils/casbinMiddleware.js';

const router = express.Router();

router.post('/', assignAccess);

router.get('/', casbinMiddleware, getPolicies);

router.patch('/:id', casbinMiddleware, updatePolicy);

router.delete('/:id', casbinMiddleware, deletePolicy);

export default router;
