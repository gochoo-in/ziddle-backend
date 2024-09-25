import Employee from '../v1/models/employee.js';
import { getCasbinEnforcer } from '../config/casbinEnforcer.js';

export const getAdminsWithAccess = async (action, resource) => {
  const employees = await Employee.find({}); 
  const employeesWithAccess = [];

  const enforcer = await getCasbinEnforcer();

  for (const employee of employees) {
    const hasAccess = await enforcer.enforce(employee._id.toString(), resource, action);

    if (hasAccess) {
      employeesWithAccess.push(employee);
    }
  }
  return employeesWithAccess;
};


export const checkOwnershipOrAdminAccess = async (employeeId, ownerId, action, resource) => {
    console.log("emp", employeeId)
    console.log("user", ownerId)
  if (employeeId === ownerId.toString()) {
    return true;
  }

  const enforcer = await getCasbinEnforcer();
  const hasAdminAccess = await enforcer.enforce(employeeId, resource, action);
  return hasAdminAccess;
};




