import express from 'express';
import { 
  getAllLeads, 
  getLeadById, 
  updateLeadStatus,  // Single function for ML, SL, HCL, Closed
  bookLead, 
  cancelLead, 
  refundLead 
} from './leads.controller.js';
import { verifyToken } from '../../../utils/token.js';  // Assuming JWT authentication
import { casbinMiddleware } from '../../../utils/casbinMiddleware.js';  // Assuming Casbin for access control

const router = express.Router();

// Lead routes
router.get('/', verifyToken, casbinMiddleware, getAllLeads);  // Get all leads
router.get('/:leadId', verifyToken, casbinMiddleware, getLeadById);  // Get a single lead

// Status update routes
router.patch('/:leadId/status', verifyToken, casbinMiddleware, updateLeadStatus);  // Update lead status (ML, SL, HCL, Closed)
router.patch('/:leadId/book', verifyToken, casbinMiddleware, bookLead);  // Book a lead
router.patch('/:leadId/cancel', verifyToken, casbinMiddleware, cancelLead);  // Cancel a lead
router.patch('/:leadId/refund', verifyToken, casbinMiddleware, refundLead);  // Refund a lead

export default router;
