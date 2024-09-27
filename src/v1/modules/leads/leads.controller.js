import Lead from '../../models/lead.js';
import moment from 'moment'; 
import { StatusCodes } from 'http-status-codes';
import httpFormatter from '../../../utils/formatter.js';
import logger from '../../../config/logger.js';
import GptActivity from '../../models/gptactivity.js'; 
import { getAdminsWithAccess } from '../../../utils/casbinService.js';
import Employee from '../../models/employee.js';  

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
    const { limit = 5, period, startDate, endDate } = req.query;

    // Helper function to generate the time filter
    const generateTimeFilter = (period) => {
      switch (period) {
        case 'day':
          return {
            createdAt: {
              $gte: moment().startOf('day').toDate(),
              $lte: moment().endOf('day').toDate(),
            },
          };
        case 'week':
          return {
            createdAt: {
              $gte: moment().startOf('week').toDate(),
              $lte: moment().endOf('week').toDate(),
            },
          };
        case 'month':
          return {
            createdAt: {
              $gte: moment().startOf('month').toDate(),
              $lte: moment().endOf('month').toDate(),
            },
          };
        case 'custom':
          if (startDate && endDate) {
            return {
              createdAt: {
                $gte: moment(startDate).startOf('day').toDate(),
                $lte: moment(endDate).endOf('day').toDate(),
              },
            };
          } else {
            return null;
          }
        default:
          return {}; // No date filter for 'allTime'
      }
    };

    const timeFilter = generateTimeFilter(period);

    // Validate the timeFilter in case of 'custom' period
    if (period === 'custom' && !timeFilter) {
      return res.status(StatusCodes.BAD_REQUEST).json(
        httpFormatter({}, 'Invalid or missing date range for custom period', false)
      );
    }

    // Apply the time filter to match the period or date range
    const topDestinations = await Lead.aggregate([
      { $match: timeFilter }, // Apply time filtering here
      {
        $lookup: {
          from: 'itineraries',
          localField: 'itineraryId',
          foreignField: '_id',
          as: 'itinerary',
        },
      },
      { $unwind: '$itinerary' },
      {
        $group: {
          _id: '$itinerary.enrichedItinerary.destination',
          totalLeads: { $sum: 1 }, // Count the number of leads for each destination
        },
      },
      { $sort: { totalLeads: -1 } }, // Sort by total number of leads per destination
      { $limit: parseInt(limit, 10) }, // Limit the number of results
    ]);

    // If no destinations are found, return an empty array
    if (topDestinations.length === 0) {
      return res.status(StatusCodes.OK).json(
        httpFormatter({ topDestinations: [] }, 'No destinations found for the specified period', true)
      );
    }

    return res.status(StatusCodes.OK).json(
      httpFormatter({ topDestinations }, 'Top destinations retrieved successfully', true)
    );
  } catch (error) {
    logger.error('Error retrieving top destinations:', error.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
  }
};



export const getTopActivities = async (req, res) => {
  try {
    const { limit = 10, period, startDate, endDate } = req.query;

    // Helper function to generate the time filter
    const generateTimeFilter = (period) => {
      switch (period) {
        case 'day':
          return {
            createdAt: {
              $gte: moment().startOf('day').toDate(),
              $lte: moment().endOf('day').toDate(),
            },
          };
        case 'week':
          return {
            createdAt: {
              $gte: moment().startOf('week').toDate(),
              $lte: moment().endOf('week').toDate(),
            },
          };
        case 'month':
          return {
            createdAt: {
              $gte: moment().startOf('month').toDate(),
              $lte: moment().endOf('month').toDate(),
            },
          };
        case 'year':
          return {
            createdAt: {
              $gte: moment().startOf('year').toDate(),
              $lte: moment().endOf('year').toDate(),
            },
          };
        case 'custom':
          if (startDate && endDate) {
            return {
              createdAt: {
                $gte: moment(startDate).startOf('day').toDate(),
                $lte: moment(endDate).endOf('day').toDate(),
              },
            };
          } else {
            return null;
          }
        default:
          return {}; // No date filter for 'allTime'
      }
    };

    const timeFilter = generateTimeFilter(period);

    // Validate the timeFilter in case of 'custom' period
    if (period === 'custom' && !timeFilter) {
      return res.status(StatusCodes.BAD_REQUEST).json(
        httpFormatter({}, 'Invalid or missing date range for custom period', false)
      );
    }

    // Step 1: Get the top activity IDs from the leads and itineraries
    const itineraryData = await Lead.aggregate([
      { $match: timeFilter },
      {
        $lookup: {
          from: 'itineraries',
          localField: 'itineraryId',
          foreignField: '_id',
          as: 'itinerary',
        },
      },
      { $unwind: '$itinerary' },
      { $unwind: '$itinerary.enrichedItinerary.itinerary' }, // Unwind each city's itinerary
      { $unwind: '$itinerary.enrichedItinerary.itinerary.days' }, // Unwind days in the city's itinerary
      { $unwind: '$itinerary.enrichedItinerary.itinerary.days.activities' }, // Unwind activities in each day
      {
        $group: {
          _id: '$itinerary.enrichedItinerary.itinerary.days.activities', // Group by activity ID
          count: { $sum: 1 }, // Count occurrences
        },
      },
      { $sort: { count: -1 } }, // Sort by count
    ]);

    // If no activities are found, return an empty array
    if (itineraryData.length === 0) {
      return res.status(StatusCodes.OK).json(
        httpFormatter({ topActivities: [] }, 'No activities found for the specified period', true)
      );
    }

    // Step 2: Fetch the corresponding activity names and categories from the GptActivity collection
    const activityIds = itineraryData.map((item) => item._id); // Extract activity IDs
    const activities = await GptActivity.find({ _id: { $in: activityIds } }).lean(); // Find activities by ID

    // Step 3: Group by activity name
    const activityMap = {}; // A map to hold activity name as key and cumulative count as value
    activities.forEach((activity) => {
      if (activity.category !== 'Travel' && activity.category !== 'Leisure') { // Filter out 'Travel' or 'Leisure' activities
        if (activityMap[activity.name]) {
          activityMap[activity.name].count += itineraryData.find(item => item._id.equals(activity._id)).count;
        } else {
          activityMap[activity.name] = {
            name: activity.name,
            count: itineraryData.find(item => item._id.equals(activity._id)).count,
          };
        }
      }
    });

    // Convert the map into an array and sort by count
    const topActivities = Object.values(activityMap).sort((a, b) => b.count - a.count).slice(0, limit);

    return res.status(StatusCodes.OK).json(httpFormatter({ topActivities }, 'Top activities retrieved successfully', true));
  } catch (error) {
    logger.error('Error retrieving top activities:', error.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
  }
};


export const getEmployeesWithUpdateAccess = async (req, res) => {
  try {
    const employeesWithAccess = await getAdminsWithAccess('UPDATE', '/api/v1/leads');
    if (!employeesWithAccess.length) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'No employees with update access found', false));
    }
    return res.status(StatusCodes.OK).json(httpFormatter({ employeesWithAccess }, 'Employees with update access retrieved successfully', true));
  } catch (error) {
    logger.error('Error retrieving employees with update access:', error.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
  }
};

export const assignLeadToEmployee = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { employeeId } = req.body;

    // Find the employee by ID
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Find the lead by ID
    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    // Assign the employee name to the lead
    lead.assignedTo = employee.name;  // Assigning the employee's name here
    lead.assignedAt = new Date(); 
    await lead.save();

    return res.status(200).json({ message: 'Employee assigned to lead successfully', lead });
  } catch (error) {
    logger.error('Error assigning employee to lead:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
