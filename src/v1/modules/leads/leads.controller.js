import Lead from '../../models/lead.js';
import moment from 'moment'; 
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

export const getLeadStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const getStatsForPeriod = async (timeFilter = {}) => {
      const totalLeads = await Lead.countDocuments(timeFilter);
      
      const ongoingLeads = await Lead.countDocuments({
        ...timeFilter,
        status: { $in: ['SL', 'ML'] } 
      });

      const cancelledLeads = await Lead.countDocuments({
        ...timeFilter,
        status: 'Cancelled'
      });

      const highlyConvertedLeads = await Lead.countDocuments({
        ...timeFilter,
        status: 'HCL'
      });

      const ongoingPercentage = totalLeads > 0 ? (ongoingLeads / totalLeads) * 100 : 0;
      const cancelledPercentage = totalLeads > 0 ? (cancelledLeads / totalLeads) * 100 : 0;
      const hclPercentage = totalLeads > 0 ? (highlyConvertedLeads / totalLeads) * 100 : 0;

      return {
        totalLeads,
        ongoingLeads,
        cancelledLeads,
        highlyConvertedLeads,
        ongoingPercentage,
        cancelledPercentage,
        hclPercentage
      };
    };

    const todayFilter = {
      createdAt: {
        $gte: moment().startOf('day').toDate(),
        $lte: moment().endOf('day').toDate()
      }
    };
    
    const weekFilter = {
      createdAt: {
        $gte: moment().startOf('week').toDate(),
        $lte: moment().endOf('week').toDate()
      }
    };
    
    const monthFilter = {
      createdAt: {
        $gte: moment().startOf('month').toDate(),
        $lte: moment().endOf('month').toDate()
      }
    };

    const allTimeFilter = {}; 

    const customDateRangeFilter = startDate && endDate
      ? {
          createdAt: {
            $gte: moment(startDate).startOf('day').toDate(),
            $lte: moment(endDate).endOf('day').toDate() 
          }
        }
      : null;

    const [dayStats, weekStats, monthStats, allTimeStats, customDateRangeStats] = await Promise.all([
      getStatsForPeriod(todayFilter),
      getStatsForPeriod(weekFilter),
      getStatsForPeriod(monthFilter),
      getStatsForPeriod(allTimeFilter),
      customDateRangeFilter ? getStatsForPeriod(customDateRangeFilter) : null
    ]);

    return res.status(StatusCodes.OK).json(httpFormatter({
      stats: {
        day: dayStats,
        week: weekStats,
        month: monthStats,
        allTime: allTimeStats,
        customDateRange: customDateRangeStats
      }
    }, 'Lead statistics retrieved successfully', true));
  } catch (error) {
    logger.error('Error retrieving lead statistics:', error.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
  }
};

export const getTopDestinations = async (req, res) => {
  try {
    const { limit = 5 } = req.query; 

    const topDestinations = await Lead.aggregate([
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
          _id: '$itinerary.enrichedItinerary.destination', 
          totalLeads: { $sum: 1 } 
        }
      },
      {
        $sort: { totalLeads: -1 } 
      },
      {
        $limit: parseInt(limit, 10) 
      }
    ]);

    if (topDestinations.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'No leads found', false));
    }

    return res.status(StatusCodes.OK).json(httpFormatter({ topDestinations }, 'Top destinations retrieved successfully', true));
  } catch (error) {
    logger.error('Error retrieving top destinations:', error.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
  }
};
