import FCM from 'fcm-node';
import User from '../../models/user.js';
import { generateOTP, isOTPExpired } from '../../../utils/otp.js';
import { createJWT, verifyToken } from '../../../utils/token.js';
import StatusCodes from 'http-status-codes';
import httpFormatter from '../../../utils/formatter.js';
import rateLimit from 'express-rate-limit';
import { FCM_KEY } from '../../../utils/constants.js';
import { sendOTPMessage } from '../../services/index.js';
import requestIp from 'request-ip';
import useragent from 'useragent';
import UserCookie from '../../models/userCookie.js';
import logger from '../../../config/logger.js';
import crypto from 'crypto';
import Wallet from '../../models/wallet.js';

const otpLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 7,
    message: 'Too many OTP requests from this IP, please try again in 5 minutes.',
    keyGenerator: (req) => req.body.phoneNumber,
});

const fcm = new FCM(FCM_KEY);

export const signup = async (req, res) => {
    try {
        const referCodeFromQuery = req.query.referCode;
        referCodeFromQuery.toString();

        if (referCodeFromQuery) {
            req.body.appliedReferralCode = referCodeFromQuery;
        }

        const { phoneNumber, otp, firstName, lastName, email, appliedReferralCode } = req.body;

        if (!phoneNumber || !firstName || !lastName || !email) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Phone number, first name, last name, and email are required', false));
        }

        if (referCodeFromQuery && appliedReferralCode && appliedReferralCode !== referCodeFromQuery) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Referral code mismatch. Please use the code provided in the link.', false));
        }

        otpLimiter(req, res, async () => {
            let user = await User.findOne({ phoneNumber });

            if (!otp) {
                if (user && user.verified) {
                    return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({ user }, 'User already registered', false));
                }

                if (!user) {
                    let referralCodeGenerated;
                    let isUnique = false;

                    while (!isUnique) {
                        const prefix = String.fromCharCode(65 + Math.floor(Math.random() * 26));
                        const randomCode = crypto.randomBytes(5).toString('hex').toUpperCase();
                        referralCodeGenerated = `${prefix}${randomCode}`;
                        const existingUser = await User.findOne({ referralCode: referralCodeGenerated });
                        if (!existingUser) {
                            isUnique = true;
                        }
                    }

                    user = await User.create({
                        phoneNumber,
                        firstName,
                        lastName,
                        email,
                        otp: generateOTP(),
                        otpExpires: new Date(Date.now() + 10 * 60 * 1000),
                        otpRequestCount: 1,
                        lastOtpRequest: new Date(),
                        referralCode: referralCodeGenerated,
                    });
                } else {
                    user.otp = generateOTP();
                    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
                    user.otpRequestCount = (user.otpRequestCount || 0) + 1;
                    user.lastOtpRequest = new Date();
                }

                await user.save();
                await sendOTPMessage(user.otp, phoneNumber);

                return res.status(StatusCodes.OK).json(httpFormatter({ user }, 'OTP sent successfully. Please verify.', true));
            } else {
                if (!user || user.otp !== otp || isOTPExpired(user.otpExpires)) {
                    return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Invalid or expired OTP', false));
                }

                user.verified = true;
                user.otp = undefined;
                user.otpExpires = undefined;
                user.otpVerifiedAt = new Date();

                if (appliedReferralCode) {
                    const appliedReferralCodeUser = await User.findOne({ referralCode: appliedReferralCode });

                    if (appliedReferralCodeUser) {
                        user.appliedReferralCode = appliedReferralCodeUser.referralCode;
                        user.referred = true;

                        await user.save();

                        await Wallet.create({ user: user._id, balance: '0', transactions: [] });

                    } else {
                        return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Invalid referral code', false));
                    }
                } else {
                    await user.save();
                }

                const token = createJWT(user._id);
                res.status(StatusCodes.OK).json({
                    status: 'success',
                    token,
                    data: { user },
                });
            }
        });
    } catch (error) {
        logger.error('Error in signup:', { message: error.message });
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};




export const signin = async (req, res) => {
    try {
        const { phoneNumber, otp } = req.body;

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
                user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
                user.otpRequestCount = (user.otpRequestCount || 0) + 1;
                user.lastOtpRequest = new Date();
                await user.save();

                await sendOTPMessage(user.otp, phoneNumber);

                return res.status(StatusCodes.OK).json(httpFormatter({ user }, 'OTP sent successfully. Please verify.', true));
            } else {
                if (!user || user.otp !== otp || isOTPExpired(user.otpExpires)) {
                    return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Invalid or expired OTP', false));
                }

                user.isLoggedIn = true;
                user.otp = undefined;
                user.otpExpires = undefined;

                const ipAddress = requestIp.getClientIp(req) || 'Unknown IP';
                const agent = useragent.parse(req.headers['user-agent'] || '');
                const deviceType = agent.device.family || 'Unknown device';
                const os = agent.os.toString() || 'Unknown OS';
                const browser = agent.toAgent() || 'Unknown browser';

                user.userLogins.push({
                    loginTime: new Date(),
                    deviceType,
                    ipAddress,
                    browser,
                    os
                });

                await user.save();

                const token = createJWT(user._id);

                await UserCookie.updateOne(
                    { cookieId: req.cookieId },
                    { $set: { userId: user._id } }
                );

                res.status(StatusCodes.OK).json({
                    status: 'success',
                    token,
                    data: { user },
                });
            }
        });
    } catch (error) {
        logger.error('Error in signin:', { message: error.message });
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

export const getAllUsers = async (req, res) => {
    try {
        // Fetch all users from the User collection
        const users = await User.find();

        // If no users are found, return a 404 status
        if (users.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'No users found', false));
        }

        // Return the list of users
        return res.status(StatusCodes.OK).json(httpFormatter({ users }, 'Users retrieved successfully', true));
    } catch (error) {
        // Log the error and return a 500 status code
        logger.error('Error retrieving users:', { message: error.message });
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

export const toggleUserBlockedStatus = async (req, res) => {
    const { id } = req.params;

    try {
        // Find the user by ID
        const user = await User.findById(id);

        if (!user) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'User not found', false));
        }

        // Toggle the blocked status
        user.blocked = !user.blocked;
        await user.save();
        return res.status(StatusCodes.OK).json(httpFormatter({ blocked: user.blocked }, `User ${user.blocked ? 'unblocked' : 'blocked'} successfully`, true));

    } catch (error) {
        console.error('Error updating blocked status:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};


export const logout = async (req, res) => {
    try {
        const userId = req.user.userId;
        const cookieId = req.cookies['userCookieId'];

        if (!cookieId) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Cookie ID not found', false));
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'User not found', false));
        }

        user.isLoggedIn = false;
        await user.save();

        await UserCookie.updateOne(
            { cookieId: cookieId },
            { $set: { userId: null } }
        );

        res.status(StatusCodes.OK).json(httpFormatter({}, 'Logout successful', true));
    } catch (error) {
        logger.error('Error in logout:', { message: error.message });
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};
