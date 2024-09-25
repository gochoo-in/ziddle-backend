import Lead from '../../models/lead.js';
import Itinerary from '../../models/itinerary.js';
import { StatusCodes } from 'http-status-codes';
import httpFormatter from '../../../utils/formatter.js';
import logger from '../../../config/logger.js';

// Get all leads
export const getAllLeads = async (req, res) => {
  try {
    const leads = await Lead.find({}).populate('itineraryId');
    if (leads.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'No leads found', false));
    }
    return res.status(StatusCodes.OK).json(httpFormatter({ leads }, 'Leads retrieved successfully', true));
  } catch (error) {
    logger.error('Error retrieving leads:', error.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
  }
};

// Get a single lead by ID
export const getLeadById = async (req, res) => {
  try {
    const { leadId } = req.params;
    const lead = await Lead.findById(leadId).populate('itineraryId');
    if (!lead) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Lead not found', false));
    }
    return res.status(StatusCodes.OK).json(httpFormatter({ lead }, 'Lead retrieved successfully', true));
  } catch (error) {
    logger.error('Error retrieving lead:', error.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
  }
};

// Admin updates lead status (ML, SL, HCL, Closed, Booked, Cancelled, Refunded)
export const updateLeadStatus = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { status } = req.body;

    const validStatuses = ['ML', 'SL', 'HCL', 'Closed', 'Booked', 'Cancelled', 'Refunded'];
    if (!validStatuses.includes(status)) {
      return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Invalid status', false));
    }

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Lead not found', false));
    }

    lead.status = status;
    await lead.save();

    return res.status(StatusCodes.OK).json(httpFormatter({ lead }, `Lead status updated to ${status}`, true));
  } catch (error) {
    logger.error('Error updating lead status:', error.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
  }
};

// Get lead statistics including popular destinations and lead counts
export const getLeadStats = async (req, res) => {
  try {
    const leadStats = await Lead.aggregate([
      {
        $lookup: {
          from: 'itineraries', 
          localField: 'itineraryId',
          foreignField: '_id',
          as: 'itinerary'
        }
      },
      {
        $unwind: '$itinerary'
      },
      {
        $group: {
          _id: '$itinerary.destination', 
          totalLeads: { $sum: 1 },
          ongoingLeads: { $sum: { $cond: [{ $eq: ['$status', 'SL'] }, 1, 0] } },
          cancelledLeads: { $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] } }, 
          highlyConvertedLeads: { $sum: { $cond: [{ $eq: ['$status', 'HCL'] }, 1, 0] } } 
        }
      },
      {
        $sort: { totalLeads: -1 } 
      }
    ]);

    const totalLeadsCount = await Lead.countDocuments();

    return res.status(StatusCodes.OK).json(httpFormatter({
      leadStats,
      totalLeads: totalLeadsCount
    }, 'Lead statistics retrieved successfully', true));
  } catch (error) {
    logger.error('Error retrieving lead statistics:', error.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
  }
};
