import express from 'express';
import { 
  getAllLeads, 
  getLeadById, 
  updateLeadStatus, 
  bookLead, 
  cancelLead, 
  refundLead,
  getLeadStats
} from './leads.controller.js';
import { casbinMiddleware } from '../../../utils/casbinMiddleware.js'; 

const router = express.Router();

router.get('/',  casbinMiddleware, getAllLeads); 
router.get('/stats',getLeadStats)
router.get('/:leadId',  casbinMiddleware, getLeadById); 
router.patch('/:leadId/status', casbinMiddleware, updateLeadStatus); 


export default router;
