import express from 'express';
import { 
  getAllLeads, 
  getLeadById, 
  updateLeadStatus, 
  getLeadStats,
  getTopDestinations,
  getTopActivities,
  getEmployeesWithUpdateAccess,
  assignLeadToEmployee
} from './leads.controller.js';
import { casbinMiddleware } from '../../../utils/casbinMiddleware.js'; 

const router = express.Router();

router.get('/',  casbinMiddleware, getAllLeads); 
router.get('/stats',getLeadStats)
router.get('/top-destinations',getTopDestinations)
router.get('/top-activities',getTopActivities)
router.get('/employees-with-update-access', casbinMiddleware, getEmployeesWithUpdateAccess);
router.get('/:leadId',  casbinMiddleware, getLeadById); 
router.patch('/:leadId/status', casbinMiddleware, updateLeadStatus); 
router.post('/:leadId/assign', casbinMiddleware, assignLeadToEmployee);



export default router;

