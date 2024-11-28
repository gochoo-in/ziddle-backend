import express from 'express';
import { adminSignup, adminSignin, adminLogout, deleteEmployee, getAllEmployees, getEmployeeById, updateEmployee,togglestatus } from './admin.controller.js';
import { verifyToken } from '../../../utils/token.js';
import { casbinMiddleware } from '../../../utils/casbinMiddleware.js';

const router = express.Router();

router.post('/signup', casbinMiddleware, adminSignup);
router.post('/signin', adminSignin);
router.post('/logout', verifyToken, adminLogout);
router.delete('/:employeeId', casbinMiddleware, deleteEmployee);
router.get('/employees', getAllEmployees);
router.get('/employees/:employeeId', getEmployeeById); 
router.patch('/employees/:employeeId', casbinMiddleware, updateEmployee);
router.patch('/employees/:employeeId/toggle-active', casbinMiddleware, togglestatus);

export default router;
