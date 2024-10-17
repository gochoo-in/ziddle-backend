import Discount from '../../models/discount.js'; 
import DiscountUsage from '../../models/discountUsage.js'; 
import User from '../../models/user.js'; 
import Itinerary from '../../models/itinerary.js'
import StatusCodes from 'http-status-codes';
import httpFormatter from '../../../utils/formatter.js';
import logger from '../../../config/logger.js';
import Settings from '../../models/settings.js';

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

export const applyDiscountFunction = async (payload, res) => {
    try {
        const { userId, discountId, totalAmount } = payload;

        // Validate input
        if (!userId || !discountId || totalAmount === undefined) {
            return  'User ID, discount ID, and total amount are required'
        }

        // Find the discount by ID
        const discount = await Discount.findById(discountId);
        if (!discount) {
            return  'Discount not found'
        }

        // Check if the discount is active
        if (!discount.active) {
            return 'This discount is not active'
        }

        // Check if this user exists
        const user = await User.findById(userId);
        if (!user) {
            return 'User not found'
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
            return 'User is not eligible for this discount'
        }

        // Check total unique users who have used the discount
        const uniqueUserIds = await DiscountUsage.distinct('userId', { discountId });
        const uniqueUserCount = uniqueUserIds.length;

        // Check how many times this user has used the discount
        const userUsageCount = await DiscountUsage.countDocuments({ userId, discountId });

        // Check limits
        if (uniqueUserCount >= discount.noOfUsersTotal && userUsageCount === 0) {
            return 0
        }

        if (userUsageCount >= discount.noOfUsesPerUser) {
            return 0
        }

        // Calculate the discount amount
        let discountAmount;
        if (discount.maxDiscount) {
            discountAmount = (totalAmount * discount.discountPercentage) / 100;
            // Ensure discountAmount does not exceed maxDiscount if it's defined
            if (discountAmount > discount.maxDiscount) {
                discountAmount = discount.maxDiscount;
            }
        } else {
            discountAmount = (totalAmount * discount.discountPercentage) / 100; // Default calculation
        }

        // Record the discount usage
        const discountUsage = new DiscountUsage({
            userId,
            discountId,
        });
        await discountUsage.save();

        // Return the calculated discount amount
        return discountAmount
    } catch (error) {
        logger.error('Error applying discount:', error);
        return error
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


// Get discounts by destination ID
export const getDiscountsByDestination = async (req, res) => {
    try {
        const { destinationId } = req.params;

        // Check if destinationId is provided
        if (!destinationId) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Destination ID is required', false));
        }

        // Find discounts associated with the given destination
        const discounts = await Discount.find({ destination: destinationId });

        // If no discounts found, return a message
        if (discounts.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'No discounts found for this destination', false));
        }

        // Return the found discounts
        return res.status(StatusCodes.OK).json(httpFormatter({ data: discounts }, 'Discounts retrieved successfully', true));
    } catch (error) {
        logger.error('Error retrieving discounts by destination:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

export const toggleArchivedStatus = async (req, res) => {
    const {id} = req.params; // Get the discount ID from the URL

    try {
        // Find the discount by ID
        const discount = await Discount.findById(id);
        
        // Check if the discount exists
        if (!discount) {
            return res.status(404).json({ message: 'Discount not found' });
        }

        // Toggle the archived value
        discount.archived = !discount.archived; 

        // Save the updated discount
        await discount.save();

        // Send back the updated discount
        res.status(200).json(discount);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};


export const toggleActiveStatus = async (req, res) => {
    const { id } = req.params;
    try {
        const discount = await Discount.findById(id);
        if (!discount) {
            return res.status(404).json({ message: 'Discount not found' });
        }

        // Toggle the active status
        discount.active = !discount.active;
        await discount.save();

        res.status(200).json({ message: 'Active status updated', discount });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const applyGeneralDiscount = async (payload, res) => {
    try {
        const { userId, discId, itineraryId } = payload;
        console.log(discId, userId, itineraryId)

        // Validate input
        if (!userId || !discId || !itineraryId) {
            return 'User ID, discount ID, and Itinerary Id are required'
        }
        const settings = await Settings.findOne();
    if (!settings) {
      return 'Settings not found'
    }

    // Fetch the itinerary using the itineraryId
    const itinerary = await Itinerary.findById(itineraryId);
    if (!itinerary) {
      return "Itinerary not found" 
    }

    // Fetch the discount using the discountId
    const discount = await Discount.findById(discId);
    if (!discount) {
      return  "Discount not found" 
    }

    if(discount.discountType === 'general')
    {
      if (discount.applicableOn.flights === true) {
        let response = await applyDiscountFunction({
          discountId: discId,
          userId: userId,
          totalAmount: itinerary.totalFlightsPrice
        });
        
        // Adjust the total price of the itinerary
        const beforeDiscount = itinerary.totalPrice;
        const tripPrice = (itinerary.totalPrice - itinerary.totalHotelsPrice + (itinerary.totalHotelsPrice - response)).toFixed(2);
        itinerary.totalPrice = itinerary.totalPrice - itinerary.totalFlightsPrice + (itinerary.totalFlightsPrice - response);
        itinerary.generalDiscount =  (beforeDiscount - itinerary.totalPrice).toFixed(2);
        itinerary.currentTotalPrice =  (tripPrice * (1 + 0.18) + settings.serviceFee).toFixed(2);
        itinerary.discounts.push(discId)
        // Save the updated itinerary
        await itinerary.save();
  
        return  "Discount on flights applied successfully"
      }
  
      else if (discount.applicableOn.hotels === true) {
        let response = await applyDiscountFunction({
          discountId: discId,
          userId: userId,
          totalAmount: itinerary.totalHotelsPrice
        });
        
        // Adjust the total price of the itinerary
        const beforeDiscount = itinerary.totalPrice;
        const tripPrice = itinerary.totalPrice - itinerary.totalHotelsPrice + (itinerary.totalHotelsPrice - response);
        itinerary.totalPrice = (itinerary.totalPrice - itinerary.totalHotelsPrice + (itinerary.totalHotelsPrice - response)).toFixed(2);
        itinerary.generalDiscount =  (beforeDiscount - itinerary.totalPrice).toFixed(2);
        itinerary.currentTotalPrice =  (tripPrice * (1 + 0.18) + settings.serviceFee).toFixed(2);
        itinerary.discounts.push(discId)
        // Save the updated itinerary
        await itinerary.save();
  
        return  "Discount on hotels applied successfully"
      }
  
      else if (discount.applicableOn.activities === true) {
        let response = await applyDiscountFunction({
          discountId: discId,
          userId: userId,
          totalAmount: itinerary.totalActivitiesPrice
        });
        const beforeDiscount = itinerary.totalPrice;
        // Adjust the total price of the itinerary
        const tripPrice = itinerary.totalPrice - itinerary.totalHotelsPrice + (itinerary.totalHotelsPrice - response);
        itinerary.totalPrice = (itinerary.totalPrice - itinerary.totalActivitiesPrice + (itinerary.totalActivitiesPrice - response)).toFixed(2);
        itinerary.generalDiscount =  (beforeDiscount - itinerary.totalPrice).toFixed(2);
        itinerary.currentTotalPrice = (tripPrice * (1 + 0.18) + settings.serviceFee).toFixed(2);
        itinerary.discounts.push(discId)
        // Save the updated itinerary
        await itinerary.save();
  
       
      }
  
      else if (discount.applicableOn.package === true) {
        let response = await applyDiscountFunction({
          discountId: discId,
          userId: userId,
          totalAmount: itinerary.totalPrice
        });
        
        // Adjust the total price of the itinerary
        const beforeDiscount = itinerary.totalPrice;
        const tripPrice = itinerary.totalPrice - itinerary.totalHotelsPrice + (itinerary.totalHotelsPrice - response);
        itinerary.totalPrice = (itinerary.totalPrice - itinerary.totalPrice + (itinerary.totalPrice - response)).toFixed(2);
        itinerary.generalDiscount = (beforeDiscount - itinerary.totalPrice).toFixed(2);
        itinerary.currentTotalPrice =  (tripPrice * (1 + 0.18) + settings.serviceFee).toFixed(2);
        itinerary.discounts.push(discId)
  
        // Save the updated itinerary
        await itinerary.save();
  
        
    } 
}
    } catch(error){
        throw error
    }
}