import Joi from 'joi';

const categorySectionValidation = Joi.object({
    categoryName: Joi.string().required().messages({
        'string.base': 'Category name should be a type of text',
        'string.empty': 'Category name is required',
        'any.required': 'Category name is required'
    }),
    sectionTitle: Joi.string().required().messages({
        'string.base': 'Section title should be a type of text',
        'string.empty': 'Section title is required',
        'any.required': 'Section title is required'
    }),
    sectionSubtitle: Joi.string().optional().messages({
        'string.base': 'Section subtitle should be a type of text'
    }),
    destinations: Joi.array().items(Joi.string().guid()).required().messages({
        'array.base': 'Destinations should be an array of IDs',
        'array.empty': 'Destinations are required',
        'any.required': 'Destinations are required',
        'string.guid': 'Each destination should be a valid ID'
    }),
    displayOrder: Joi.number().required().messages({
        'number.base': 'Display order should be a number',
        'any.required': 'Display order is required'
    }),
    isHighlighted: Joi.boolean().optional().messages({
        'boolean.base': 'Is highlighted should be a boolean value'
    })
});
export default categorySectionValidation;