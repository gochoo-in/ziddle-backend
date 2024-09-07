import { verifyToken } from './token.js';
import User from '../v1/models/user.js';
import UserCookie from '../v1/models/userCookie.js';
import UserActivity from '../v1/models/userActivity.js';
import { getLocationFromIp } from './GeoLocation.js';
import requestIp from 'request-ip';
import useragent from 'useragent';
import { v4 as uuidv4 } from 'uuid';
import cookie from 'cookie';


const isAdmin = async (req, res, next) => {
  try {
    verifyToken(req, res, async () => {
      const userId = req.user.userId;
      const user = await User.findById(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admins only.' });
      }

      next();
    });
  } catch (error) {
    console.error(`isAdmin Error: ${error.message}`);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export default isAdmin;




export const trackUserActivity = async (req, res, next) => {
    try {
        const cookieId = req.cookieId;

        if (!cookieId) {
            throw new Error('Cookie ID is missing');
        }
        let userId = null;

        if (cookieId) {
            const userCookie = await UserCookie.findOne({ cookie_id: cookieId });

            if (userCookie) {
                userId = userCookie.user_id;
            }
        }

        // Get user agent and IP address
        const ip_address = requestIp.getClientIp(req) || 'Unknown IP';
        const agent = useragent.parse(req.headers['user-agent'] || '');
        const device_type = agent.device.family || 'Unknown device';
        const os = agent.os.toString() || 'Unknown OS';
        const browser = agent.toAgent() || 'Unknown browser';
        const page = req.originalUrl || 'Unknown page';
        const action = req.method || 'Unknown action';
        const location = await getLocationFromIp(ip_address);
        
        await UserActivity.create({
            cookie_id: cookieId,
            user_id: userId,
            page,
            action,
            device_type,
            browser,
            ip_address,
            location: location=="-"?"Unknown Location":location, 
            os
        });

        next();
    } catch (error) {
        console.error('Error tracking user activity:', error);
        next(); // Ensure middleware chain continues even if tracking fails
    }
};



export const cookieManager = async (req, res, next) => {
  try {
      
      const cookies = cookie.parse(req.headers.cookie || '');
      let cookieId = cookies['user_cookie_id'];

      if (!cookieId) {
        
          cookieId = uuidv4();
          await UserCookie.create({
              cookie_id: cookieId,
              cookie_value: cookieId, 
              created_at: new Date(),
              user_id: null 
          });
          res.cookie('user_cookie_id', cookieId, { httpOnly: true, maxAge: 365 * 24 * 60 * 60 * 1000 }); // Cookie lasts for 1 year
      }

      req.cookieId = cookieId;
      next();
  } catch (error) {
      console.error('Error managing cookie:', error);
      next();
  }
};
