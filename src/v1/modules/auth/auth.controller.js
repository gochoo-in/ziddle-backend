import User from '../../models/user.js';
import { generateOTP, isOTPExpired } from '../../../utils/otp.js';
import { createJWT } from '../../../utils/token.js';
import StatusCodes from 'http-status-codes';
import httpFormatter from '../../../utils/formatter.js';
import rateLimit from 'express-rate-limit';

const otpLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, 
    max: 3, 
    message: 'Too many OTP requests from this IP, please try again later.',
    keyGenerator: (req) => req.body.phoneNumber,
});

export const createSendToken = (user, statusCode, res) => {
    const token = createJWT(user._id);

    res.status(statusCode).json({
        status: 'success',
        token,  
        data: {
            user,
        },
    });
};

export const signup = async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Phone number is required', false));
        }

        otpLimiter(req, res, async () => {
            let user = await User.findOne({ phoneNumber });
            if (user) {
                if (user.verified) {
                    return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({user}, 'User already registered', false));
                }
                const otp = generateOTP();
                const otpExpires = new Date(Date.now() + 5 * 60 * 1000);
                user.otp = otp;
                user.otpExpires = otpExpires;
                user.otpRequestCount = (user.otpRequestCount || 0) + 1;
                user.lastOtpRequest = new Date();
                await user.save();

                console.log(`OTP for signing up a user with ${phoneNumber}: ${otp}`);
                return res.status(StatusCodes.OK).json(httpFormatter({ user }, 'OTP sent successfully. Please verify to complete signup.', true));
            } else {
                user = await User.create({
                    phoneNumber,
                    otp: generateOTP(),
                    otpExpires: new Date(Date.now() + 5 * 60 * 1000),
                    otpRequestCount: 1,
                    lastOtpRequest: new Date(),
                });

                console.log(`OTP for signing up a user with ${phoneNumber}: ${user.otp}`);
                res.status(StatusCodes.OK).json(httpFormatter({ user }, 'OTP sent successfully. Please verify to complete signup.', true));
            }
        });
    } catch (error) {
        console.error('Error in signup:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

export const verifySignup = async (req, res) => {
    try {
        const { phoneNumber, otp } = req.body;
        if (!phoneNumber || !otp) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Phone number and OTP are required' ,false));
        }

        const user = await User.findOne({ phoneNumber });
        if (!user || user.otp !== otp || isOTPExpired(user.otpExpires)) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Invalid or expired OTP' ,false));
        }

        user.verified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        res.status(StatusCodes.OK).json({user}, 'Signup successful' ,true);
    } catch (error) {
        console.error('Error verifying signup OTP:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error' ,false));
    }
};

export const login = async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Phone number is required', false));
        }

        otpLimiter(req, res, async () => {
            const user = await User.findOne({ phoneNumber });
            if (!user) {
                return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'User not found', false));
            }

            const otp = generateOTP();
            const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

            user.otp = otp;
            user.otpExpires = otpExpires;
            user.otpRequestCount = (user.otpRequestCount || 0) + 1;
            user.lastOtpRequest = new Date();
            await user.save();

            console.log(`OTP for signing in user with ${phoneNumber}: ${otp}`);

            res.status(StatusCodes.OK).json(httpFormatter({ user }, 'OTP sent successfully. Please verify to complete login.', true));
        });
    } catch (error) {
        console.error('Error in login:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

export const verifyLogin = async (req, res) => {
    try {
        const { phoneNumber, otp } = req.body;
        if (!phoneNumber || !otp) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Phone number and OTP are required' ,false));
        }

        const user = await User.findOne({ phoneNumber });
        if (!user || user.otp !== otp || isOTPExpired(user.otpExpires)) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Invalid or expired OTP' ,false));
        }

        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        const token = createJWT(user._id);
        res.status(StatusCodes.OK).json({
            status: 'success',
            token,
            data: {
                user,
            },
        });
    } catch (error) {
        console.error('Error verifying login OTP:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error' ,false));
    }
};
