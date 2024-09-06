import User from "../../models/user.js";

export const updateUserRole = async(req,res,next) => {
    const { userId } = req.params;
    const { role } = req.body;
    try {

        if (!['user', 'admin', 'staff'].includes(role)) {
          return res.status(400).json({ message: 'Invalid role provided.' });
        }
    
        const user = await User.findById(userId);
    
        if (!user) {
          return res.status(404).json({ message: 'User not found.' });
        }
    
        user.role = role;
        await user.save();
    
        return res.status(200).json({ message: 'Role updated successfully.', user });
      } catch (error) {
        return res.status(500).json({ message: 'Error updating role.', error });
      }
    
}