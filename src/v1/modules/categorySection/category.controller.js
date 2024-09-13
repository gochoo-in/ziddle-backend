import Section from '../../models/categorySection.js';
import httpFormatter from '../../../utils/formatter.js';
import { StatusCodes } from 'http-status-codes';
import logger from '../../../config/logger.js';

// Add a new section
export const addSection = async (req, res) => {
    try {
        const { categoryName, sectionTitle, sectionSubtitle, destinations, displayOrder, isHighlighted } = req.body;

        const section = new Section({
            categoryName,
            sectionTitle,
            sectionSubtitle,
            destinations,
            displayOrder,
            isHighlighted
        });

        await section.save();

        return res.status(StatusCodes.CREATED).json(httpFormatter({ section }, 'Section added successfully', true));
    } catch (error) {
        logger.error('Error adding section:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

// Get all sections
export const getAllSections = async (req, res) => {
    try {
        const sections = await Section.find().populate('destinations');

        return res.status(StatusCodes.OK).json(httpFormatter({ sections }, 'Sections retrieved successfully', true));
    } catch (error) {
        logger.error('Error retrieving sections:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

// Get section by ID
export const getSectionById = async (req, res) => {
    try {
        const { sectionId } = req.params;

        if (!sectionId) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Section ID is required', false));
        }

        const section = await Section.findById(sectionId).populate('destinations');

        if (!section) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Section not found', false));
        }

        return res.status(StatusCodes.OK).json(httpFormatter({ section }, 'Section retrieved successfully', true));
    } catch (error) {
        logger.error('Error retrieving section:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

// Update a section by ID
export const updateSection = async (req, res) => {
    try {
        const { sectionId } = req.params;

        const { categoryName, sectionTitle, sectionSubtitle, destinations, displayOrder, isHighlighted } = req.body;

        if (!sectionId) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Section ID is required', false));
        }

        const section = await Section.findById(sectionId);
        if (!section) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Section not found', false));
        }

        if (categoryName) section.categoryName = categoryName;
        if (sectionTitle) section.sectionTitle = sectionTitle;
        if (sectionSubtitle) section.sectionSubtitle = sectionSubtitle;
        if (destinations) section.destinations = destinations;
        if (displayOrder !== undefined) section.displayOrder = displayOrder;
        if (isHighlighted !== undefined) section.isHighlighted = isHighlighted;

        await section.save();

        return res.status(StatusCodes.OK).json(httpFormatter({ section }, 'Section updated successfully', true));
    } catch (error) {
        logger.error('Error updating section:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};

// Delete a section by ID
export const deleteSection = async (req, res) => {
    try {
        const { sectionId } = req.params;

        if (!sectionId) {
            return res.status(StatusCodes.BAD_REQUEST).json(httpFormatter({}, 'Section ID is required', false));
        }

        const section = await Section.findByIdAndDelete(sectionId);

        if (!section) {
            return res.status(StatusCodes.NOT_FOUND).json(httpFormatter({}, 'Section not found', false));
        }

        return res.status(StatusCodes.OK).json(httpFormatter({}, 'Section deleted successfully', true));
    } catch (error) {
        logger.error('Error deleting section:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(httpFormatter({}, 'Internal server error', false));
    }
};
