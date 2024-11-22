import bcrypt from 'bcrypt';
import Employee from '../../models/employee.js';
import { StatusCodes } from 'http-status-codes';
import httpFormatter from '../../../utils/formatter.js';
import { createJWT } from '../../../utils/token.js';
import { getCasbinEnforcer } from '../../../config/casbinEnforcer.js';
import mongoose from 'mongoose';
import logger from '../../../config/logger.js';

const CasbinPolicy = mongoose.connection.collection('casbinpolicies');

// Admin Signup
export const adminSignup = async (req, res) => {
  try {
    const { name, email, phone,password } = req.body;

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
      phone,
      password,
      isLoggedIn: false,
    });

    logger.info('Admin created successfully:', newAdmin);

    return res.status(StatusCodes.CREATED).json(httpFormatter({ newAdmin }, 'Admin registered successfully', true));
  } catch (error) {
    logger.error('Error during admin signup:', error.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
  }
};

// Admin Signin
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

    return res.status(StatusCodes.OK).json(httpFormatter({ token, admin }, 'Login successful', true));
  } catch (error) {
    logger.error('Error during admin signin:', error.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
  }
};

// Admin Logout
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

    return res.status(StatusCodes.OK).json(httpFormatter({}, 'Logout successful', true));
  } catch (error) {
    logger.error('Error during logout:', error.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
  }
};

export const deleteEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;

    // Validate the employee ID
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Invalid employee ID', false));
    }

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
    return res.status(StatusCodes.OK).json(httpFormatter({}, 'Employee and associated policies deleted successfully', true));
  } catch (error) {
    logger.error('Error deleting employee or policies:', error.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
  }
};

// Get All Employees
export const getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({});

    if (employees.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'No employees found', false));
    }

    return res.status(StatusCodes.OK).json(httpFormatter({ employees }, 'Employees retrieved successfully', true));
  } catch (error) {
    logger.error('Error retrieving employees:', error.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
  }
};

// Get Single Employee by ID
export const getEmployeeById = async (req, res) => {
  try {
    const { employeeId } = req.params;

    // Validate the employee ID
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Invalid employee ID', false));
    }

    // Find the employee by ID
    const employee = await Employee.findById(employeeId);

    if (!employee) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Employee not found', false));
    }

    // Return the employee details
    return res.status(StatusCodes.OK).json(httpFormatter({ employee }, 'Employee retrieved successfully', true));
  } catch (error) {
    logger.error('Error retrieving employee:', error.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
  }
};

// Update Employee Details
export const updateEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { name, email, phone } = req.body;

    // Validate the employee ID
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Invalid employee ID', false));
    }

    // Find the employee by ID
    const employee = await Employee.findById(employeeId);

    if (!employee) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Employee not found', false));
    }

    // Update employee details
    if (name) employee.name = name;
    if (email) employee.email = email;
    if (phone) employee.phone = phone;

    // Save the updated employee
    await employee.save();

    return res.status(StatusCodes.OK).json(httpFormatter({ employee }, 'Employee details updated successfully', true));
  } catch (error) {
    logger.error('Error updating employee details:', error.message);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
  }
};



export const togglestatus = async (req, res) => {
  const { employeeId } = req.params;

  try {
    // Find the employee by ID
    const employee = await Employee.findById(employeeId);

    if (!employee) {
      return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Employee not found', false));
    }

    // Toggle the blocked status if the request body has the blocked field
    if (req.body.hasOwnProperty('blocked')) {
      employee.blocked = !employee.blocked; // Toggle blocked status
    }



    // Save the updated employee document
    await employee.save();

    res.status(200).json({ message: 'Employee updated successfully', employee });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};