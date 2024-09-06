import FCM from 'fcm-node';
import User from '../../models/user.js';
import { generateOTP, isOTPExpired } from '../../../utils/otp.js';
import { createJWT, verifyToken } from '../../../utils/token.js';
import StatusCodes from 'http-status-codes';
import httpFormatter from '../../../utils/formatter.js';
import rateLimit from 'express-rate-limit';
import { FCM_KEY } from '../../../utils/constants.js';
import { sendOTPMessage } from '../../services/index.js'; 

const otpLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 7,
    message: 'Too many OTP requests from this IP, please try again in 5 minutes.',
    keyGenerator: (req) => req.body.phoneNumber,
});

const fcm = new FCM(FCM_KEY);

export const signup = async (req, res) => {
    try {
        let { phoneNumber, otp } = req.body;
        phoneNumber = phoneNumber;

        if (!phoneNumber) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Phone number is required', false));
        }

        otpLimiter(req, res, async () => {
            let user = await User.findOne({ phoneNumber });

            if (!otp) {
                if (user && user.verified) {
                    return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({ user }, 'User already registered', false));
                }

                if (!user) {
                    user = await User.create({
                        phoneNumber,
                        otp: generateOTP(),
                        otpExpires: new Date(Date.now() + 10 * 60 * 1000), // OTP expires in 10 minutes
                        otpRequestCount: 1,
                        lastOtpRequest: new Date(),
                    });
                } else {
                    user.otp = generateOTP();
                    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // OTP expires in 10 minutes
                    user.otpRequestCount = (user.otpRequestCount || 0) + 1;
                    user.lastOtpRequest = new Date();
                }

                await user.save();
                console.log(`OTP for signing up user with ${phoneNumber}: ${user.otp}`);

                await sendOTPMessage(user.otp, phoneNumber); // Use the sendOTPMessage service

                return res.status(StatusCodes.OK).json(httpFormatter({ user }, 'OTP sent successfully. Please verify.', true));
            } else {
                if (!user || user.otp !== otp || isOTPExpired(user.otpExpires)) {
                    return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Invalid or expired OTP', false));
                }

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

export const signin = async (req, res) => {
    try {
        let { phoneNumber, otp } = req.body;
        phoneNumber = phoneNumber;

        if (!phoneNumber) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Phone number is required', false));
        }

        otpLimiter(req, res, async () => {
            let user = await User.findOne({ phoneNumber });

            if (!otp) {
                if (!user) {
                    return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'User not found', false));
                }

                user.otp = generateOTP();
                user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // OTP expires in 10 minutes
                user.otpRequestCount = (user.otpRequestCount || 0) + 1;
                user.lastOtpRequest = new Date();
                await user.save();

                console.log(`OTP for logging in user with ${phoneNumber}: ${user.otp}`);

                await sendOTPMessage(user.otp, phoneNumber); // Use the sendOTPMessage service

                return res.status(StatusCodes.OK).json(httpFormatter({ user }, 'OTP sent successfully. Please verify.', true));
            } else {
                if (!user || user.otp !== otp || isOTPExpired(user.otpExpires)) {
                    return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Invalid or expired OTP', false));
                }

                user.isLoggedIn = true;
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

export const logout = async (req, res) => {
    try {
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
