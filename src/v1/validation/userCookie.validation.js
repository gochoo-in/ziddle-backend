import Joi from 'joi';

// Validation schema for UserCookie
const userCookieValidation = {
  body: Joi.object().keys({
    cookieId: Joi.string()
      .guid({ version: 'uuidv4' })
      .optional() // cookieId might be auto-generated, hence it's optional
      .messages({
        'string.guid': 'Cookie ID must be a valid UUID',
      }),
    cookieValue: Joi.string()
      .required()
      .messages({
        'string.base': 'Cookie value must be a string',
        'any.required': 'Cookie value is required',
      }),
    userId: Joi.string()
      .optional()
      .messages({
        'string.base': 'User ID must be a string',
      }),
  }),
};

export default userCookieValidation;
