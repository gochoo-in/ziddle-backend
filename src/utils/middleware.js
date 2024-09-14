import httpFormatter from '../utils/formatter.js';
import { StatusCodes } from 'http-status-codes';
import { verifyToken } from './token.js';
import User from '../v1/models/user.js';
import UserCookie from '../v1/models/userCookie.js';
import UserActivity from '../v1/models/userActivity.js';
import { getLocationFromIp } from './geoLocation.js';
import requestIp from 'request-ip';
import useragent from 'useragent';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger.js';
import cookie from 'cookie';

export const trackUserActivity = async (req, res, next) => {
    try {
        const cookieId = req.cookieId;

        if (!cookieId) {
            return res
                .status(StatusCodes.BAD_REQUEST)
                .json(httpFormatter({}, 'Cookie ID is missing', false));
        }

        let userId = null;
        const userCookie = await UserCookie.findOne({ cookieId: cookieId });

        if (userCookie) {
            userId = userCookie.userId; // Get user ID from the cookie record
        }

        // Extract user agent and IP address details
        const ipAddress = requestIp.getClientIp(req) || 'Unknown IP';
        const agent = useragent.parse(req.headers['user-agent'] || '');
        const deviceType = agent.device.family || 'Unknown device';
        const os = agent.os.toString() || 'Unknown OS';
        const browser = agent.toAgent() || 'Unknown browser';
        const page = req.originalUrl || 'Unknown page';
        const action = req.method || 'Unknown action';
        const location = await getLocationFromIp(ipAddress);
        
        // Create a user activity record in the database
        await UserActivity.create({
            cookieId: cookieId,
            userId: userId,
            page,
            action,
            deviceType,
            browser,
            ipAddress,
            location: location === "-" ? "Unknown Location" : location,
            os
        });

        next();
    } catch (error) {
        logger.error('Error tracking user activity:', error);
        return res
            .status(StatusCodes.INTERNAL_SERVER_ERROR)
            .json(httpFormatter({}, 'Internal server error', false));
    }
};

export const cookieManager = async (req, res, next) => {
    try {
        const cookies = req.cookies; // Use cookie-parser middleware to parse cookies
        let cookieId = cookies['userCookieId'];

        if (!cookieId) {
            // No cookie found in the browser, generate a new one
            cookieId = uuidv4();

            // Store the new cookie in the database
            await UserCookie.create({
                cookieId: cookieId,
                cookieValue: cookieId, 
                user_id: null, 
            });

            // Set the new cookie in the response
            res.cookie('userCookieId', cookieId, { 
                httpOnly: true, 
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
            });
        } else {
            // Check if the cookie exists in the database
            const existingCookie = await UserCookie.findOne({ cookieId });

            if (!existingCookie) {
                // If the cookie doesn't exist in the database, regenerate a new one
                const newCookieId = uuidv4();

                // Store the new cookie in the database
                await UserCookie.create({
                    cookieId: newCookieId,
                    cookieValue: newCookieId,
                    user_id: null
                });

                // Set the new cookie
                res.cookie('userCookieId', newCookieId, { 
                    httpOnly: true, 
                    maxAge: 7 * 24 * 60 * 60 * 1000 
                });

                // Update the request object with the new cookieId
                req.cookieId = newCookieId;
            } else {
                // Cookie exists in the database, no need to regenerate
                req.cookieId = existingCookie.cookieId;

                // Optionally, update the updatedAt field in the database
                existingCookie.updatedAt = new Date();
                await existingCookie.save();
            }
        }

        next();
    } catch (error) {
        logger.error('Error managing cookie:', error);
        return res
            .status(StatusCodes.INTERNAL_SERVER_ERROR)
            .json(httpFormatter({}, 'Internal server error', false));
    }
};