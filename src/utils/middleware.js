import { verifyToken } from './token.js';
import User from '../v1/models/user.js';

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
