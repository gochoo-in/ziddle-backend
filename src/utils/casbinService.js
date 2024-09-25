import Employee from '../v1/models/employee.js';
import { getCasbinEnforcer } from '../config/casbinEnforcer.js';

// Get employees with access to a specific action and resource
export const getAdminsWithAccess = async (action, resource) => {
  const employees = await Employee.find({}); // Fetch all employees
  const employeesWithAccess = [];

  // Retrieve the Casbin enforcer instance
  const enforcer = await getCasbinEnforcer();

  for (const employee of employees) {
    // Use the enforcer to check if the employee has access to the resource and action
    const hasAccess = await enforcer.enforce(employee._id.toString(), resource, action);

    // Only push employees who have access
    if (hasAccess) {
      employeesWithAccess.push(employee);
    }
  }

  return employeesWithAccess;
};
