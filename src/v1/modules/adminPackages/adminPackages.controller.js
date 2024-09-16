import PackageTemplate from '../../models/adminPackage.js';
import { StatusCodes } from 'http-status-codes';
import httpFormatter from '../../../utils/formatter.js';
import logger from '../../../config/logger.js';

export const createPackageTemplate = async (req, res) => {
    try {
        // Extract employeeId from route parameters
        const { employeeId } = req.params;

        const {
            destinationId,
            templateName,
            imageUrls,
            duration,
            basePrice,
            hotelRating,
            cityIds,
            activityIds,
            transportationIds,
            isCustomizable,
            thirdPartyBookings
        } = req.body;

        // Validate required fields (basic validation, can be extended)
        if (!templateName || !destinationId || !basePrice || !cityIds || !activityIds || !transportationIds) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Required fields are missing', false));
        }

        // Create a new package template
        const packageTemplate = new PackageTemplate({
            destinationId,
            employeeId, // Employee ID from route parameters
            templateName,
            imageUrls,
            duration,
            basePrice,
            hotelRating,
            cityIds,
            activityIds,
            transportationIds,
            isCustomizable
        });

        // Save the template to the database
        const savedPackageTemplate = await packageTemplate.save();

        return res.status(StatusCodes.CREATED).json(httpFormatter({ savedPackageTemplate }, 'Package template created successfully', true));
    } catch (error) {
        logger.error('Error creating package template:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

export const getFilteredPackages = async (req, res) => {
    try {
        const {
            destinationId,
            minPrice,
            maxPrice,
            duration,
            hotelRating,
            travelCompanion,
            packageType
        } = req.query;

        // Initialize the query object to store filter conditions
        let query = {};

        // Apply filters only if they are provided

        // Filter by destination
        if (destinationId) {
            query.destinationId = destinationId;
        }

        // Filter by price range (budget)
        if (minPrice && maxPrice) {
            query.basePrice = { $gte: minPrice, $lte: maxPrice };
        }

        // Filter by duration (e.g., "5 Days, 4 Nights")
        if (duration) {
            query.duration = duration;
        }

        // Filter by hotel rating (e.g., 3-star, 4-star)
        if (hotelRating) {
            query.hotelRating = { $in: hotelRating.split(',').map(Number) }; // Expecting a comma-separated list of ratings
        }

        // (Optional) Filter by package type (e.g., International, Domestic)
        if (packageType) {
            query.packageType = packageType;  // Assuming packageType is stored in the collection
        }

        // Fetch the filtered packages from the database
        const packages = await PackageTemplate.find(query); // If query is empty, it will fetch all packages

        // Return the filtered packages
        return res.status(StatusCodes.OK).json(httpFormatter({ packages }, 'Filtered packages fetched successfully', true));

    } catch (error) {
        logger.error('Error fetching filtered packages:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};


export const updatePackageTemplate = async (req, res) => {
    try {
        const { packageId } = req.params;
        const updateData = req.body;

        // Find the package by ID and update it with the new data
        const updatedPackage = await PackageTemplate.findByIdAndUpdate(packageId, updateData, { new: true });

        if (!updatedPackage) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Package not found', false));
        }

        return res.status(StatusCodes.OK).json(httpFormatter({ updatedPackage }, 'Package template updated successfully', true));
    } catch (error) {
        logger.error('Error updating package template:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

// DELETE: Remove a package template
export const deletePackageTemplate = async (req, res) => {
    try {
        const { packageId } = req.params;

        // Find the package by ID and delete it
        const deletedPackage = await PackageTemplate.findByIdAndDelete(packageId);

        if (!deletedPackage) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Package not found', false));
        }

        return res.status(StatusCodes.OK).json(httpFormatter({}, 'Package template deleted successfully', true));
    } catch (error) {
        logger.error('Error deleting package template:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};
