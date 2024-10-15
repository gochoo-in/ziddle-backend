import Discount from '../../models/discount.js'; 
import DiscountUsage from '../../models/discountUsage.js'; 
import User from '../../models/user.js'; 
import Itinerary from '../../models/itinerary.js'
import StatusCodes from 'http-status-codes';
import httpFormatter from '../../../utils/formatter.js';
import logger from '../../../config/logger.js';

// Create a new discount
export const addDiscount = async (req, res) => {
    try {
        const {
            applicableOn,
            destination,
            discountType,
            userType,
            noOfUsesPerUser,
            noOfUsersTotal,
            startDate,
            endDate,
            discountPercentage,
            maxDiscount,
            noLimit,
            active,
            archived
        } = req.body;

        // Validate required fields
        if (!applicableOn || !destination || !discountType || !userType ||
            !noOfUsesPerUser || !noOfUsersTotal || !discountPercentage) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'All fields are required', false));
        }

        const newDiscount = new Discount({
            applicableOn,
            destination,
            discountType,
            userType,
            noOfUsesPerUser,
            noOfUsersTotal,
            startDate,
            endDate,
            discountPercentage,
            maxDiscount,
            noLimit,
            active,
            archived
        });

        const savedDiscount = await newDiscount.save();

        return res.status(StatusCodes.CREATED).json(httpFormatter({ data: savedDiscount }, 'Discount added successfully', true));

    } catch (error) {
        logger.error('Error adding discount:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};


export const applyDiscount = async (req, res) => {
    try {
        const { userId, discountId, totalAmount } = req.body;

        // Validate input
        if (!userId || !discountId || totalAmount === undefined) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'User ID, discount ID, and total amount are required', false));
        }

        // Find the discount by ID
        const discount = await Discount.findById(discountId);
        if (!discount) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Discount not found', false));
        }

        // Check if the discount is active
        if (!discount.active) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'This discount is not active', false));
        }

        // Check if this user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'User not found', false));
        }

        // Check user type eligibility
        const isNewUser = !(await Itinerary.exists({ createdBy: user._id }));
        const isOldUser = await Itinerary.exists({ createdBy: user._id });

        let userTypeEligible = false;
        if (discount.userType === 'all') {
            userTypeEligible = true; // All users are eligible
        } else if (discount.userType === 'new users') {
            userTypeEligible = isNewUser; // Eligible if no itineraries exist
        } else if (discount.userType === 'old users') {
            userTypeEligible = isOldUser; // Eligible if at least one itinerary exists
        }

        if (!userTypeEligible) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'User is not eligible for this discount', false));
        }

        // Check total unique users who have used the discount
        const uniqueUserIds = await DiscountUsage.distinct('userId', { discountId });
        const uniqueUserCount = uniqueUserIds.length;

        // Check how many times this user has used the discount
        const userUsageCount = await DiscountUsage.countDocuments({ userId, discountId });

        // Check limits
        if (uniqueUserCount >= discount.noOfUsersTotal && userUsageCount === 0) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'The discount has reached its maximum usage limit for users', false));
        }

        if (userUsageCount >= discount.noOfUsesPerUser) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'User has exceeded the usage limit for this discount', false));
        }

        // Calculate the discount amount
        let discountAmount;
        if (discount.maxDiscount) {
            discountAmount = (discount.maxDiscount * discount.discountPercentage) / 100;
        } else {
            discountAmount = (totalAmount * discount.discountPercentage) / 100; // Default calculation
        }

        // Ensure discountAmount does not exceed maxDiscount if it's defined
        if (discount.maxDiscount && discountAmount > discount.maxDiscount) {
            discountAmount = discount.maxDiscount;
        }

        // Record the discount usage
        const discountUsage = new DiscountUsage({
            userId,
            discountId,
        });
        await discountUsage.save();

        // Log total usage for all users
        const totalUsageCount = await DiscountUsage.countDocuments({ discountId });

        return res.status(StatusCodes.OK).json(httpFormatter({ discount: discountAmount }, 'Discount applied successfully', true));
    } catch (error) {
        logger.error('Error applying discount:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};



// Get all discounts with optional active filtering
export const getAllDiscounts = async (req, res) => {
    try {
        const isActive = req.query.active === 'true';
        const query = isActive ? { active: true } : {};

        const discounts = await Discount.find(query);

        return res.status(StatusCodes.OK).json({
            data: {
                data: discounts,
            },
            message: 'Discounts retrieved successfully',
        });
    } catch (error) {
        logger.error('Error retrieving discounts:', error);
        return res
            .status(StatusCodes.INTERNAL_SERVER_ERROR)
            .json(httpFormatter({}, 'Internal server error', false));
    }
};

// Update a discount
export const updateDiscount = async (req, res) => {
    const { id } = req.params;
    const { destination, active, archived } = req.body;

    try {
        const updatedDiscount = await Discount.findByIdAndUpdate(
            id,
            {
                destination,
                active,
                archived
            },
            { new: true }
        );

        if (!updatedDiscount) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Discount not found', false));
        }

        res.status(StatusCodes.OK).json(httpFormatter({ data: updatedDiscount }, 'Discount updated successfully', true));
    } catch (error) {
        logger.error('Error updating discount:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};


export const getDiscounts = async (req, res) => {
    try {
        const { id } = req.params;

        let discounts;
        if (id) {
            discounts = await Discount.findById(id);
            if (!discounts) {
                return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Discount not found', false));
            }
        } else {
            discounts = await Discount.find();
        }

        res.status(StatusCodes.OK).json(httpFormatter({ data: discounts }, 'Discounts fetched successfully', true));
    } catch (error) {
        logger.error('Error fetching discounts:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};
