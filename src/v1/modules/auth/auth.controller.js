
import jwt from 'jsonwebtoken'
import User from '../../models/user.js';


const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: Date.now() + 10 * 24 * 60 * 60 * 1000,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + 10 * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true,
  };
  if (process.env.NODE_ENV === "production") cookieOptions.secure = true;

  res.cookie("jwt", token, cookieOptions);

 
  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};
export const login = async(req,res)=>{
    try {
        const { phoneNumber, password } = req.body;
        if (!phoneNumber || !password) {
            return res.status(400).json({message:"Phone number and Password are required!"});
        }
        const user = await User.findOne({ phoneNumber }).select("+password");

        if (!user) {
            return res.status(401).json({message:"Incorrect email or password"})
        }

        createSendToken(user, 200, res);
    } catch (error) {
        console.error("error in login",error);
        return res.status(500).json({message:"Internal server error"})
    }
}


export const signup = async(req,res)=>{
    try {
        const newUser = await User.create({
        fullname: req.body.fullname,
        email: req.body.email,
        password: req.body.password,
        phoneNumber: req.body.phoneNumber
        });
        createSendToken(newUser, 201, res);
    } catch (error) {
        console.error("error in signup",error)
        return res.status(500).json({message:"Internal server error"})
    }
}
