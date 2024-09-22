import logger from '../config/logger.js'; 
import { StatusCodes } from 'http-status-codes';
import { getCasbinEnforcer } from '../config/casbinEnforcer.js';
import httpFormatter from './formatter.js';
import { verifyToken } from './token.js';

export const casbinMiddleware = async (req, res, next) => {
  try {
    // Verify token first
    await verifyToken(req, res, async () => {
      logger.info('--- Casbin Middleware Start ---');
      logger.debug('Extracted user from token', { user: req.user });

      if (!req.user || !req.user.userId) { 
        logger.warn('User not found or invalid token payload');
        return res
          .status(StatusCodes.UNAUTHORIZED)
          .json(httpFormatter({}, 'User not found', false));
      }

      const employeeId = req.user.userId;  // Assuming this is the ID stored in v0
      const resource = req.originalUrl.split('?')[0];  // Remove query params for resource matching
      const action = req.method.toUpperCase();  // e.g. 'GET', 'POST', 'PATCH', etc.

      logger.debug('Enforcement inputs', { employeeId, resource, action });

      const enforcer = await getCasbinEnforcer();

      const policies = await enforcer.getPolicy();
      logger.debug('Loaded Casbin policies', { policies });

      // Add logs to check the policies loaded
      console.log('Loaded Casbin policies:', policies);

      const allowed = await enforcer.enforce(employeeId, resource, action);  // Casbin enforcement check
      
      // Log the result of enforcement
      logger.info('Enforcement result', {
        employeeId,
        resource,
        action,
        allowed,
      });

      // Add console log for enforcement result
      console.log(`Casbin enforce result: ${allowed} for resource: ${resource}, action: ${action}, user: ${employeeId}`);

      if (!allowed) {
        logger.warn('Access denied', { employeeId, resource, action });
        return res
          .status(StatusCodes.FORBIDDEN)
          .json(httpFormatter({}, 'Access denied', false));
      }

      logger.info('Access granted. Proceeding to next middleware or handler.');
      logger.info('--- Casbin Middleware End ---');
      next();
    });
  } catch (error) {
    logger.error('Casbin middleware error', { error: error.message });
    console.error('Casbin middleware error:', error.message);  // Add a console log for error
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(httpFormatter({}, 'Error processing request', false));
  }
};
