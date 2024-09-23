import logger from '../../../config/logger.js'; // Adjust the path as necessary
import { StatusCodes } from 'http-status-codes';
import casbinpolicy from '../../models/policy.js';
import httpFormatter from '../../../utils/formatter.js';
import endpointModel from '../../models/endpoint.js'; // Assuming you have an endpoint model


// Add Endpoint and Action Function (with category)
export const addEndpointAction = async (req, res) => {
  const { title, endpoint, action, category } = req.body; // Added 'category' to request body

  // Validate required fields
  if (!title || !endpoint || !action || !category) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json(httpFormatter({}, 'Missing title, endpoint, action, or category', false));
  }

  try {
    // Check if the endpoint with the specific action already exists
    const existingEndpoint = await endpointModel.findOne({ endpoint, action });

    if (existingEndpoint) {
      return res
        .status(StatusCodes.CONFLICT)
        .json(httpFormatter({}, 'Endpoint with this action already exists', false));
    }

    // Create new endpoint-action pair with category
    const newEndpointAction = await endpointModel.create({
      title,
      endpoint,
      action,
      category, // Store category like 'destinations' or 'cities'
    });

    res
      .status(StatusCodes.CREATED)
      .json(httpFormatter({ newEndpointAction }, 'Endpoint and action added successfully', true));
  } catch (error) {
    logger.error('Error adding endpoint and action:', error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(httpFormatter({}, 'Internal Server Error', false));
  }
};


// Get Policies Function
export const getPolicies = async (req, res) => {
  try {
    const policies = await casbinpolicy.find();
    res
      .status(StatusCodes.OK)
      .json(httpFormatter({ policies }, 'Policies fetched successfully', true));
  } catch (error) {
    logger.error('Error fetching policies:', error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(httpFormatter({}, 'Internal Server Error', false));
  }
};

// Update Policy Function
export const updatePolicy = async (req, res) => {
  const { id } = req.params;
  const { ptype, employeeId, endpoint, action } = req.body;

  // Validate required fields
  if (!employeeId || !endpoint || !action) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json(httpFormatter({}, 'Missing employeeId, endpoint, or action', false));
  }

  try {
    // Check for conflicting policies
    const existingPolicy = await casbinpolicy.findOne({
      _id: { $ne: id },
      ptype,
      v0: employeeId,
      v1: endpoint,
      v2: action,
    });

    if (existingPolicy) {
      return res
        .status(StatusCodes.CONFLICT)
        .json(httpFormatter({}, 'A policy with these details already exists', false));
    }

    // Update the policy
    const updatedPolicy = await casbinpolicy.findByIdAndUpdate(
      id,
      { ptype, v0: employeeId, v1: endpoint, v2: action },
      { new: true, runValidators: true }
    );

    if (!updatedPolicy) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(httpFormatter({}, 'Policy not found', false));
    }

    res
      .status(StatusCodes.OK)
      .json(httpFormatter({ updatedPolicy }, 'Policy updated successfully', true));
  } catch (error) {
    logger.error('Error updating policy:', error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(httpFormatter({}, 'Internal Server Error', false));
  }
};

// Delete Policy Function
export const deletePolicy = async (req, res) => {
  const { id } = req.params;

  try {
    // Delete the policy
    const deletedPolicy = await casbinpolicy.findByIdAndDelete(id);

    if (!deletedPolicy) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(httpFormatter({}, 'Policy not found', false));
    }

    res
      .status(StatusCodes.OK)
      .json(httpFormatter({}, 'Policy deleted successfully', true));
  } catch (error) {
    logger.error('Error deleting policy:', error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(httpFormatter({}, 'Internal Server Error', false));
  }
};




export const assignAccess = async (req, res) => {
  const policies = req.body;

  // Log the incoming policies
  console.log('Assigning policies:', policies);

  if (!Array.isArray(policies) || policies.length === 0) {
    console.log('No policies provided');
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json(httpFormatter({}, 'No policies provided', false));
  }

  try {
    const policyPromises = policies.map(async (policy) => {
      const { employeeId, endpoint, action } = policy;

      // Log the policy details
      console.log(`Processing policy: Employee ID: ${employeeId}, Endpoint: ${endpoint}, Action: ${action}`);

      // Check if the policy already exists for the employee
      const existingPolicy = await casbinpolicy.findOne({
        v0: employeeId,
        v1: endpoint,
        v2: action,
      });

      if (existingPolicy) {
        console.log(`Policy already exists for Employee ID: ${employeeId}, Endpoint: ${endpoint}, Action: ${action}`);
        return null; // Skip creating a duplicate policy
      }

      // Create the new policy for the employee
      console.log(`Creating new policy for Employee ID: ${employeeId}, Endpoint: ${endpoint}, Action: ${action}`);
      return await casbinpolicy.create({
        ptype: 'p',
        v0: employeeId, // Employee ID
        v1: endpoint,   // Endpoint
        v2: action,     // Action (GET, POST, etc.)
      });
    });

    // Wait for all policies to be processed
    await Promise.all(policyPromises);

    res
      .status(StatusCodes.CREATED)
      .json(httpFormatter({}, 'Policies added successfully', true));
  } catch (error) {
    console.error('Error creating policies:', error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(httpFormatter({}, 'Internal Server Error', false));
  }
};


// Modified getAllEndpointActions function with logging
export const getAllEndpointActions = async (req, res) => {
  const { employeeId } = req.query;

  console.log(`Fetching policies for Employee ID: ${employeeId}`);

  try {
    // Fetch all endpoints grouped by category
    const endpointActions = await endpointModel.aggregate([
      {
        $group: {
          _id: "$category", // Group by category
          endpoints: { $push: { title: "$title", action: "$action", endpoint: "$endpoint" } }
        }
      }
    ]);

    console.log('All available endpoints:', endpointActions);

    let assignedPolicies = [];
    let hasWildcardPolicy = false;

    if (employeeId) {
      // Fetch all policies for the employee
      assignedPolicies = await casbinpolicy.find({ v0: employeeId });
      console.log(`Assigned policies for Employee ID ${employeeId}:`, assignedPolicies);

      // Check if the employee has a wildcard policy
      hasWildcardPolicy = assignedPolicies.some(policy => policy.v1 === '/*' && policy.v2 === '*');
      if (hasWildcardPolicy) {
        console.log(`Employee ID ${employeeId} has a wildcard policy`);
      } else {
        console.log(`Employee ID ${employeeId} does not have a wildcard policy`);
      }
    }

    // Combine data to mark the already assigned policies as checked
    const transformedData = endpointActions.map((category) => {
      const endpoints = category.endpoints.map((endpoint) => {
        const isChecked = hasWildcardPolicy || assignedPolicies.some(
          (policy) => policy.v1 === endpoint.endpoint && policy.v2 === endpoint.action
        );
        console.log(`Endpoint: ${endpoint.endpoint}, Action: ${endpoint.action}, Checked: ${isChecked}`);
        return { ...endpoint, checked: isChecked };
      });

      return { _id: category._id, endpoints };
    });

    res
      .status(StatusCodes.OK)
      .json(httpFormatter({ endpointActions: transformedData }, 'Endpoints and actions fetched successfully', true));
  } catch (error) {
    console.error('Error fetching endpoints and actions:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal Server Error', false));
  }
};

// Get Policies for a Specific Employee
export const getEmployeePolicies = async (req, res) => {
  const { employeeId } = req.params;

  if (!employeeId) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json(httpFormatter({}, 'Employee ID is required', false));
  }

  try {
    // Fetch all policies assigned to the employee
    const employeePolicies = await casbinpolicy.find({ v0: employeeId });

    // If no policies are found
    if (!employeePolicies || employeePolicies.length === 0) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json(httpFormatter({}, 'No policies found for this employee', false));
    }

    console.log(`Policies for Employee ID ${employeeId}:`, employeePolicies);

    // Return policies
    res
      .status(StatusCodes.OK)
      .json(httpFormatter({ employeePolicies }, 'Employee policies fetched successfully', true));
  } catch (error) {
    console.error('Error fetching employee policies:', error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(httpFormatter({}, 'Internal Server Error', false));
  }
};


// Remove Policies for an Employee
export const removeEmployeePolicies = async (req, res) => {
  const { employeeId, policies } = req.body;

  if (!employeeId || !policies || policies.length === 0) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json(httpFormatter({}, 'Employee ID and policies to remove are required', false));
  }

  try {
    const removePromises = policies.map(async (policy) => {
      const { v1: endpoint, v2: action } = policy;

      // Find the policy and delete it
      const deletedPolicy = await casbinpolicy.findOneAndDelete({
        v0: employeeId,
        v1: endpoint,
        v2: action,
      });

      return deletedPolicy;
    });

    // Wait for all policies to be deleted
    await Promise.all(removePromises);

    res
      .status(StatusCodes.OK)
      .json(httpFormatter({}, 'Policies removed successfully', true));
  } catch (error) {
    console.error('Error removing policies:', error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(httpFormatter({}, 'Internal Server Error', false));
  }
};
