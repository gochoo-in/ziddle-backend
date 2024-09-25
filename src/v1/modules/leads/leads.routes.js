import express from 'express';
import { 
  getAllLeads, 
  getLeadById, 
  updateLeadStatus,  // Single function for ML, SL, HCL, Closed
  bookLead, 
  cancelLead, 
  refundLead,
  getLeadStats
} from './leads.controller.js';
import { casbinMiddleware } from '../../../utils/casbinMiddleware.js';  // Assuming Casbin for access control

const router = express.Router();

// Lead routes
router.get('/',  casbinMiddleware, getAllLeads);  // Get all leads
router.get('/stats',getLeadStats)
router.get('/:leadId',  casbinMiddleware, getLeadById);  // Get a single lead

// Status update routes
router.patch('/:leadId/status', casbinMiddleware, updateLeadStatus);  // Update lead status (ML, SL, HCL, Closed)
router.patch('/:leadId/book',  casbinMiddleware, bookLead);  // Book a lead
router.patch('/:leadId/cancel',  casbinMiddleware, cancelLead);  // Cancel a lead
router.patch('/:leadId/refund',  casbinMiddleware, refundLead);  // Refund a lead

export default router;
