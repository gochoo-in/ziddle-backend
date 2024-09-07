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
    destinationName: Joi.string()
      .required()
      .messages({
        'string.base': 'Destination name must be a string',
        'any.required': 'Destination name is required',
      }),
    country: Joi.string()
      .required()
      .messages({
        'string.base': 'Country must be a string',
        'any.required': 'Country is required',
      }),
    latitude: Joi.number()
      .required()
      .messages({
        'number.base': 'Latitude must be a number',
        'any.required': 'Latitude is required',
      }),
    longitude: Joi.number()
      .required()
      .messages({
        'number.base': 'Longitude must be a number',
        'any.required': 'Longitude is required',
      }),
    best_time_to_visit: Joi.string()
      .optional(),
    is_major_hub: Joi.boolean()
      .optional(),
    points_of_interest: Joi.array()
      .items(Joi.string())
      .optional(),
    climate: Joi.string()
      .optional(),
    language_spoken: Joi.string()
      .required()
      .messages({
        'string.base': 'Language spoken must be a string',
        'any.required': 'Language spoken is required',
      }),
    travel_time_from_hub: Joi.number()
      .optional()
  }),
};

export default cityValidation;
