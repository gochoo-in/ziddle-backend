import PackageTemplate from '../../models/adminPackage.js';
import { StatusCodes } from 'http-status-codes';
import httpFormatter from '../../../utils/formatter.js';
import logger from '../../../config/logger.js';

// Create Package Template
export const createPackageTemplate = async (req, res) => {
    try {
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
            packageType,
            travelCompanion,
            tripDuration  // Added tripDuration
        } = req.body;

        // Validate required fields
        if (!templateName || !destinationId || !basePrice || !cityIds || !activityIds || !transportationIds || !packageType || !travelCompanion || !tripDuration) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Required fields are missing', false));
        }

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
            isCustomizable,
            packageType,
            travelCompanion,
            tripDuration  // Ensure tripDuration is included in the package
        });

        const savedPackageTemplate = await packageTemplate.save();

        return res.status(StatusCodes.CREATED).json(httpFormatter({ savedPackageTemplate }, 'Package template created successfully', true));
    } catch (error) {
        logger.error('Error creating package template:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

// Get Filtered Packages
export const getFilteredPackages = async (req, res) => {
    try {
        const { destinationId, minPrice, maxPrice, duration, hotelRating, travelCompanion, packageType, tripDuration } = req.query;

        const query = {};

        if (destinationId) query.destinationId = destinationId;
        if (minPrice && maxPrice) query.basePrice = { $gte: minPrice, $lte: maxPrice };
        if (duration) query.duration = duration;
        if (hotelRating) query.hotelRating = { $in: hotelRating.split(',').map(Number) };
        if (packageType) query.packageType = packageType;
        if (travelCompanion) query.travelCompanion = { $in: travelCompanion.split(',') };
        if (tripDuration) query.tripDuration = tripDuration;  // Filter by tripDuration

        const packages = await PackageTemplate.find(query);

        return res.status(StatusCodes.OK).json(httpFormatter({ packages }, 'Filtered packages fetched successfully', true));
    } catch (error) {
        logger.error('Error fetching filtered packages:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

// Update Package Template
export const updatePackageTemplate = async (req, res) => {
    try {
        const { packageId } = req.params;
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
            packageType,
            travelCompanion,
            tripDuration  // Added tripDuration
        } = req.body;

        // Check if at least one field is provided for update
        if (!destinationId && !templateName && !imageUrls && !duration && basePrice === undefined && hotelRating === undefined && !cityIds && !activityIds && !transportationIds && isCustomizable === undefined && !packageType && !travelCompanion && !tripDuration) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'At least one field is required to update', false));
        }

        const packageTemplate = await PackageTemplate.findById(packageId);
        if (!packageTemplate) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Package not found', false));
        }

        // Update fields if they are provided
        if (destinationId) packageTemplate.destinationId = destinationId;
        if (templateName) packageTemplate.templateName = templateName;
        if (imageUrls) packageTemplate.imageUrls = imageUrls;
        if (duration) packageTemplate.duration = duration;
        if (basePrice !== undefined) packageTemplate.basePrice = basePrice;
        if (hotelRating !== undefined) packageTemplate.hotelRating = hotelRating;
        if (cityIds) packageTemplate.cityIds = cityIds;
        if (activityIds) packageTemplate.activityIds = activityIds;
        if (transportationIds) packageTemplate.transportationIds = transportationIds;
        if (isCustomizable !== undefined) packageTemplate.isCustomizable = isCustomizable;
        if (packageType) packageTemplate.packageType = packageType;
        if (travelCompanion) packageTemplate.travelCompanion = travelCompanion;
        if (tripDuration) packageTemplate.tripDuration = tripDuration;  // Update tripDuration

        await packageTemplate.save();

        return res.status(StatusCodes.OK).json(httpFormatter({ packageTemplate }, 'Package template updated successfully', true));
    } catch (error) {
        logger.error('Error updating package template:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

// Delete Package Template
export const deletePackageTemplate = async (req, res) => {
    try {
        const { packageId } = req.params;

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
