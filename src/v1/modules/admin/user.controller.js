import User from "../../models/user.js";
import httpFormatter from "../../../utils/formatter.js";
import { StatusCodes } from "http-status-codes";

export const updateUserRole = async (req, res, next) => {
  const { userId } = req.params;
  const { role } = req.body;

  try {
    if (!['user', 'admin', 'staff'].includes(role)) {
      return res.status(StatusCodes.BAD_REQUEST).json(
        httpFormatter({}, 'Invalid role provided.', false)
      );
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json(
        httpFormatter({}, 'User not found.', false)
      );
    }

    user.role = role;
    await user.save();

    return res.status(StatusCodes.OK).json(
      httpFormatter({ user }, 'Role updated successfully.', true)
    );
  } catch (error) {
    console.error('Error updating user role:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
      httpFormatter({}, 'Error updating role.', false)
    );
  }
};
