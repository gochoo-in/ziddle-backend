import Joi from 'joi';

const contactUsValidation = {
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
    message: Joi.string()
      .min(10)
      .max(5000)
      .required()
      .messages({
        'string.base': 'Message must be a string',
        'string.min': 'Message must be at least 10 characters long',
        'string.max': 'Message must be at most 5000 characters long',
        'any.required': 'Message is required',
      }),
  }),
};

export default contactUsValidation;
