import Joi from 'joi';

const cityValidation = {
  body: Joi.object().keys({
    name: Joi.string()
      .min(2)
      .max(100)
      .required()
      .messages({
        'string.base': 'City name must be a string',
        'string.min': 'City name must be at least 2 characters long',
        'string.max': 'City name must be at most 100 characters long',
        'any.required': 'City name is required',
      }),
    iataCode: Joi.string()
      .length(3)
      .required()
      .messages({
        'string.base': 'IATA code must be a string',
        'string.length': 'IATA code must be exactly 3 characters long',
        'any.required': 'IATA code is required',
      }),
    countryName: Joi.string()
      .required()
      .messages({
        'string.base': 'Country name must be a string',
        'any.required': 'Country name is required',
      }),
  }),
};

export default cityValidation;
