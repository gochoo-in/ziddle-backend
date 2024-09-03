import User from '../../models/user.js';
import { generateOTP, isOTPExpired } from '../../../utils/otp.js';
import { createJWT, verifyToken } from '../../../utils/token.js'; // Import the token functions
import StatusCodes from 'http-status-codes';
import httpFormatter from '../../../utils/formatter.js';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv'; 

dotenv.config(); 

const otpLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, 
    max: 5, 
    message: 'Too many OTP requests from this IP, please try again in 5 minutes.',
    keyGenerator: (req) => req.body.phoneNumber,
});

// Function for handling signup
export const signup = async (req, res) => {
    try {
        const { phoneNumber, otp } = req.body;

        if (!phoneNumber) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Phone number is required', false));
        }

        otpLimiter(req, res, async () => {
            let user = await User.findOne({ phoneNumber });

            if (!otp) {
                // Generate OTP for signup
                if (user && user.verified) {
                    return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({ user }, 'User already registered', false));
                }

                if (!user) {
                    user = await User.create({
                        phoneNumber,
                        otp: generateOTP(),
                        otpExpires: new Date(Date.now() + 5 * 60 * 1000),
                        otpRequestCount: 1,
                        lastOtpRequest: new Date(),
                    });
                } else {
                    user.otp = generateOTP();
                    user.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
                    user.otpRequestCount = (user.otpRequestCount || 0) + 1;
                    user.lastOtpRequest = new Date();
                }

                await user.save();
                console.log(`OTP for signing up user with ${phoneNumber}: ${user.otp}`);
                return res.status(StatusCodes.OK).json(httpFormatter({ user }, 'OTP sent successfully. Please verify.', true));
            } else {
                // Verify OTP for signup
                if (!user || user.otp !== otp || isOTPExpired(user.otpExpires)) {
                    return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Invalid or expired OTP', false));
                }

                // OTP is valid, complete signup
                user.verified = true;
                user.otp = undefined;
                user.otpExpires = undefined;
                await user.save();

                const token = createJWT(user._id);
                res.status(StatusCodes.OK).json({
                    status: 'success',
                    token,
                    data: { user },
                });
            }
        });
    } catch (error) {
        console.error('Error in signup:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

// Function for handling login
export const signin = async (req, res) => {
    try {
        const { phoneNumber, otp } = req.body;

        if (!phoneNumber) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Phone number is required', false));
        }

        otpLimiter(req, res, async () => {
            let user = await User.findOne({ phoneNumber });

            if (!otp) {
                // Generate OTP for login
                if (!user) {
                    return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'User not found', false));
                }

                user.otp = generateOTP();
                user.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
                user.otpRequestCount = (user.otpRequestCount || 0) + 1;
                user.lastOtpRequest = new Date();
                await user.save();

                console.log(`OTP for logging in user with ${phoneNumber}: ${user.otp}`);
                return res.status(StatusCodes.OK).json(httpFormatter({ user }, 'OTP sent successfully. Please verify.', true));
            } else {
                // Verify OTP for login
                if (!user || user.otp !== otp || isOTPExpired(user.otpExpires)) {
                    return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Invalid or expired OTP', false));
                }

                user.isLoggedIn = true; // Only set to true if OTP is valid
                user.otp = undefined;
                user.otpExpires = undefined;
                await user.save();

                const token = createJWT(user._id);
                res.status(StatusCodes.OK).json({
                    status: 'success',
                    token,
                    data: { user },
                });
            }
        });
    } catch (error) {
        console.error('Error in signing in:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

// Function for handling logout
export const logout = async (req, res) => {
    try {
        // Use the verifyToken middleware to handle token verification
        verifyToken(req, res, async () => {
            const userId = req.user.userId;

            const user = await User.findById(userId);
            if (!user) {
                return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'User not found', false));
            }

            user.isLoggedIn = false;
            await user.save();

            res.status(StatusCodes.OK).json(httpFormatter({}, 'Logout successful', true));
        });
    } catch (error) {
        console.error('Error in logging out:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};
