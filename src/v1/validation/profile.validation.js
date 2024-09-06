import Joi from 'joi';

const profileValidation = {
    params: Joi.object({
        userId: Joi.string()
            .required()
            .messages({
                'string.base': 'User ID must be a string',
                'any.required': 'User ID is required',
            }),
        }),
        body: Joi.object().keys({
            fullName: Joi.string()
                .min(2)
                .max(100)
                .required()
                .messages({
                    'string.base': 'Full name must be a string',
                    'string.min': 'Full name must be at least 2 characters long',
                    'string.max': 'Full name must be at most 100 characters long',
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
            preferredLanguage: Joi.string()
                .optional()
                .messages({
                    'string.base': 'Preferred language must be a string',
                }),
            address: Joi.object().keys({
                line1: Joi.string()
                    .required()
                    .messages({
                        'string.base': 'Address line1 must be a string',
                        'any.required': 'Address line1 is required',
                    }),
                line2: Joi.string()
                    .optional()
                    .messages({
                        'string.base': 'Address line2 must be a string',
                    }),
                line3: Joi.string()
                    .optional()
                    .messages({
                        'string.base': 'Address line3 must be a string',
                    }),
                state: Joi.string()
                    .optional()
                    .messages({
                        'string.base': 'State must be a string',
                    }),
                pincode: Joi.string()
                    .required()
                    .messages({
                        'string.base': 'Pincode must be a string',
                        'any.required': 'Pincode is required',
                    }),
                nationality: Joi.string()
                    .optional()
                    .messages({
                        'string.base': 'Nationality must be a string',
                    }),
            }),
            profilePhoto: Joi.string()
                .optional()
                .messages({
                    'string.base': 'Profile photo must be a string',
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
        }),
    };

    export default profileValidation;
