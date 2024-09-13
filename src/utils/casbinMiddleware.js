import logger from '../config/logger.js'; 

import { StatusCodes } from 'http-status-codes';
import { getCasbinEnforcer } from '../config/casbinEnforcer.js';
import httpFormatter from './formatter.js';
import { verifyToken } from './token.js';

export const casbinMiddleware = async (req, res, next) => {
  try {
    await verifyToken(req, res, async () => {
        console.log(req.user)
      logger.info('--- Casbin Middleware Start ---');
      logger.debug('Extracted user from token', { user: req.user });

      if (!req.user || !req.user.userId) { 
        logger.warn('User not found or invalid token payload');
        return res
          .status(StatusCodes.UNAUTHORIZED)
          .json(httpFormatter({}, 'User not found', false));
      }
      
      const employeeId = req.user.userId; 
      const resource = req.originalUrl; 
      const action = req.method.toUpperCase(); 

      logger.debug('Enforcement inputs', { employeeId, resource, action });

      const enforcer = await getCasbinEnforcer();

      const policies = await enforcer.getPolicy();
      console.log(policies)
      logger.debug('Loaded Casbin policies', { policies });

      const allowed = await enforcer.enforce(employeeId, resource, action); 
console.log("result", allowed)
      logger.info('Enforcement result', {
        employeeId,
        resource,
        action,
        allowed,
      });

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
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(httpFormatter({}, 'Error processing request', false));
  }
};
