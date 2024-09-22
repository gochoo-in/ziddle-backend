import express from 'express';
import {
  assignAccess,
  getPolicies,
  updatePolicy,
  deletePolicy,
  addEndpointAction,
  getAllEndpointActions,
  getEmployeePolicies,
  removeEmployeePolicies, // Import the new remove function
} from './policy.controller.js';
import { casbinMiddleware } from '../../../utils/casbinMiddleware.js';

const router = express.Router();

// Assign policies to an employee
router.post('/', casbinMiddleware, assignAccess);

// Get all policies
router.get('/', casbinMiddleware, getPolicies);

// Update a specific policy by ID
router.patch('/:id', casbinMiddleware, updatePolicy);

// Delete a specific policy by ID
router.delete('/:id', casbinMiddleware, deletePolicy);

// Add new endpoint and action
router.post('/endpoint', casbinMiddleware, addEndpointAction);

// Get all endpoint actions grouped by category
router.get('/endpoint', casbinMiddleware,  getAllEndpointActions);

// Get policies assigned to a specific employee
router.get('/:employeeId', casbinMiddleware, getEmployeePolicies);

// Remove policies from an employee
router.post('/remove', casbinMiddleware, removeEmployeePolicies); 

export default router;
