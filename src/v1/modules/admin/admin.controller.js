import bcrypt from 'bcrypt';
import Employee from '../../models/employee.js';
import { StatusCodes } from 'http-status-codes';
import httpFormatter from '../../../utils/formatter.js';
import { createJWT } from '../../../utils/token.js';
import { getCasbinEnforcer } from '../../../config/casbinEnforcer.js';
import mongoose from 'mongoose';
import logger from '../../../config/logger.js';

export const adminSignup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!email || !password || !name) {
      return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'All fields are required', false));
    }

    const existingAdmin = await Employee.findOne({ email });

    if (existingAdmin) {
      return res.status(StatusCodes.CONFLICT).json(httpFormatter({}, 'Admin with this email already exists', false));
    }

    const newAdmin = await Employee.create({
      name,
      email,
      password,
      isLoggedIn: false, 
    });

    res.status(StatusCodes.CREATED).json(httpFormatter({ newAdmin }, 'Admin registered successfully', true));
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
  }
};

export const adminSignin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Email and password are required', false));
    }

    const admin = await Employee.findOne({ email }).select('+password');

    if (!admin) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'User not registered', false));
    }

    if (admin.blocked) {
      return res.status(StatusCodes.FORBIDDEN).json(httpFormatter({}, 'This account is blocked', false));
    }

    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(StatusCodes.UNAUTHORIZED).json(httpFormatter({}, 'Invalid credentials', false));
    }

    if (admin.isLoggedIn) {
      return res.status(StatusCodes.CONFLICT).json(httpFormatter({}, 'Admin is already logged in', false));
    }

    const token = createJWT(admin._id);
    if (!token) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Failed to generate token', false));
    }

    admin.isLoggedIn = true;
    await admin.save();

    res.status(StatusCodes.OK).json(httpFormatter({ token, admin }, 'Login successful', true));
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
  }
};

export const adminLogout = async (req, res) => {
  try {
    const admin = await Employee.findById(req.user.userId);

    if (!admin) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Admin not found', false));
    }

    if (!admin.isLoggedIn) {
      return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Admin is already logged out', false));
    }

    admin.isLoggedIn = false;
    await admin.save();

    res.status(StatusCodes.OK).json(httpFormatter({}, 'Logout successful', true));
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
  }
};



const CasbinPolicy = mongoose.connection.collection('casbinpolicies');

export const deleteEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;

    // Check if the employee exists
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Employee not found', false));
    }

    // Delete the employee from the database
    await Employee.findByIdAndDelete(employeeId);

    // Directly remove policies associated with the employeeId (v0 field) from the "casbinpolicies" collection
    const result = await CasbinPolicy.deleteMany({ v0: employeeId });

    // Log the number of policies removed
    logger.info(`Deleted ${result.deletedCount} policies for employee ${employeeId}`);

    // Send success response
    res.status(StatusCodes.OK).json(httpFormatter({}, 'Employee and associated policies deleted successfully', true));
  } catch (error) {
    logger.error('Error deleting employee or policies:', error.message);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
  }
};