import httpFormatter from '../utils/formatter.js';
import { StatusCodes } from 'http-status-codes';
import { verifyToken } from './token.js';
import User from '../v1/models/user.js';
import UserCookie from '../v1/models/userCookie.js';
import UserActivity from '../v1/models/userActivity.js';
import { getLocationFromIp } from './GeoLocation.js';
import requestIp from 'request-ip';
import useragent from 'useragent';
import { v4 as uuidv4 } from 'uuid';
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
        console.error('Error tracking user activity:', error);
        return res
            .status(StatusCodes.INTERNAL_SERVER_ERROR)
            .json(httpFormatter({}, 'Internal server error', false));
    }
};

export const cookieManager = async (req, res, next) => {
    try {
        const cookies = req.cookies; // Use cookie-parser middleware directly
        let cookieId = cookies['user_cookie_id'];

        if (!cookieId) {
            // If no cookie, generate a new one
            cookieId = uuidv4();
            await UserCookie.create({
                cookieId: cookieId,
                cookieValue: cookieId, 
                user_id: null // Assuming user is null if not logged in
            });

            // Set the cookie for the user with 1-year expiry
            res.cookie('user_cookie_id', cookieId, { httpOnly: true, maxAge: 365 * 24 * 60 * 60 * 1000 });
        }

        // Attach cookieId to the request object
        req.cookieId = cookieId;
        next();
    } catch (error) {
        console.error('Error managing cookie:', error);
        return res
            .status(StatusCodes.INTERNAL_SERVER_ERROR)
            .json(httpFormatter({}, 'Internal server error', false));
    }
};
