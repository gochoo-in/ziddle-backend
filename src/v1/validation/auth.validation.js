import Joi from 'joi';

const signupValidation = {
  body: Joi.object().keys({
    firstName: Joi.string()
      .min(2)
      .max(30)
      .required()
      .messages({
        'string.base': 'First name must be a string',
        'string.empty': 'First name cannot be empty',
        'string.min': 'First name must have at least 2 characters',
        'string.max': 'First name must have at most 30 characters',
        'any.required': 'First name is required',
      }),
    lastName: Joi.string()
      .min(2)
      .max(30)
      .required()
      .messages({
        'string.base': 'Last name must be a string',
        'string.empty': 'Last name cannot be empty',
        'string.min': 'Last name must have at least 2 characters',
        'string.max': 'Last name must have at most 30 characters',
        'any.required': 'Last name is required',
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
    otp: Joi.string()
      .length(4)
      .optional()
      .messages({
        'string.base': 'OTP must be a string',
        'string.length': 'OTP must be exactly 4 digits',
      }),
  }),
};

const signinValidation = {
  body: Joi.object().keys({
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
    otp: Joi.string()
      .length(4)
      .optional()
      .messages({
        'string.base': 'OTP must be a string',
        'string.length': 'OTP must be exactly 4 digits',
      }),
  }),
};

export default { signupValidation, signinValidation };
