import User from "../../models/user.js";
import httpFormatter from "../../../utils/formatter.js";
import { StatusCodes } from "http-status-codes";


export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find();

    if (users.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json(
        httpFormatter({}, 'No users found.', false)
      );
    }

    return res.status(StatusCodes.OK).json(
      httpFormatter({ users }, 'Users retrieved successfully.', true)
    );
  } catch (error) {
    console.error('Error retrieving users:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
      httpFormatter({}, 'Error retrieving users.', false)
    );
  }
};