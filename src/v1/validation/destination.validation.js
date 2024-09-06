import Joi from 'joi';

const destinationValidation = {
  body: Joi.object().keys({
    name: Joi.string()
      .min(2)
      .max(100)
      .required()
      .messages({
        'string.base': 'Destination name must be a string',
        'string.min': 'Destination name must be at least 2 characters long',
        'string.max': 'Destination name must be at most 100 characters long',
        'any.required': 'Destination name is required',
      }),
    currency: Joi.string()
      .length(3)
      .required()
      .messages({
        'string.base': 'Currency must be a string',
        'string.length': 'Currency code must be exactly 3 characters long',
        'any.required': 'Currency is required',
      }),
    timezone: Joi.string()
      .pattern(/^UTC[+-]\d{2}:\d{2}$/)
      .required()
      .messages({
        'string.pattern.base': 'Timezone must be in the format UTC±HH:MM',
        'any.required': 'Timezone is required',
      }),
    tripDuration: Joi.array()
      .items(Joi.string())
      .required()
      .messages({
        'array.base': 'Trip duration must be an array of strings',
        'any.required': 'Trip duration is required',
      }),
  }),
};

export default destinationValidation;
