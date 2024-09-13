import Joi from 'joi';

const signupValidation = {
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
