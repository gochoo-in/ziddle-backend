import Notification from '../../models/notification.js';
import { StatusCodes } from 'http-status-codes';
import httpFormatter from '../../../utils/formatter.js';

export const getNotifications = async (req, res) => {
  try {
    const employeeId = req.user.userId;

    const notifications = await Notification.find({ employeeId });
    console.log(employeeId, notifications)

    return res.status(StatusCodes.OK).json(httpFormatter({ notifications }, 'Notifications retrieved successfully', true));
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
  }
};
