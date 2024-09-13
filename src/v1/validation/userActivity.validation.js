import Joi from 'joi';

// Validation schema for UserActivity
const userActivityValidation = {
  body: Joi.object().keys({
    cookieId: Joi.string()
      .guid({ version: 'uuidv4' })
      .required()
      .messages({
        'string.guid': 'Cookie ID must be a valid UUID',
        'any.required': 'Cookie ID is required',
      }),
    userId: Joi.string()
      .optional()
      .messages({
        'string.base': 'User ID must be a string',
      }),
    page: Joi.string()
      .required()
      .messages({
        'string.base': 'Page must be a string',
        'any.required': 'Page is required',
      }),
    action: Joi.string()
      .required()
      .messages({
        'string.base': 'Action must be a string',
        'any.required': 'Action is required',
      }),
    deviceType: Joi.string()
      .optional()
      .messages({
        'string.base': 'Device type must be a string',
      }),
    browser: Joi.string()
      .optional()
      .messages({
        'string.base': 'Browser must be a string',
      }),
    ipAddress: Joi.string()
      .optional()
      .messages({
        'string.base': 'IP address must be a string',
      }),
    location: Joi.string()
      .optional()
      .messages({
        'string.base': 'Location must be a string',
      }),
    os: Joi.string()
      .optional()
      .messages({
        'string.base': 'Operating system (OS) must be a string',
      }),
  }),
};

export default userActivityValidation;
