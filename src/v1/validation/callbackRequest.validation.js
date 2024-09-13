import Joi from 'joi';

const callbackRequestValidation = {
  body: Joi.object().keys({
    fullName: Joi.string()
      .min(2)
      .max(50)
      .required()
      .messages({
        'string.base': 'Full name must be a string',
        'string.min': 'Full name must be at least 2 characters long',
        'string.max': 'Full name must be at most 50 characters long',
        'any.required': 'Full name is required',
      }),
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.base': 'Email must be a string',
        'string.email': 'Email must be a valid email address',
        'any.required': 'Email is required',
      }),
    phoneNumber: Joi.string()
      .length(10)
      .pattern(/^[0-9]+$/)
      .required()
      .messages({
        'string.base': 'Phone number must be a string',
        'string.length': 'Phone number must be exactly 10 digits',
        'string.pattern.base': 'Phone number must contain only digits',
        'any.required': 'Phone number is required',
      }),
    destination: Joi.string()
      .required()
      .messages({
        'string.base': 'Destination must be a string',
        'any.required': 'Destination is required',
      }),
  }),
};

export default callbackRequestValidation;
