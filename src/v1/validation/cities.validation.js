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
    destinationId: Joi.string()
      .required()
      .messages({
        'string.base': 'Destination Id must be a string',
        'any.required': 'Destination Id is required',
      }),
    country: Joi.string()
      .required()
      .messages({
        'string.base': 'Country must be a string',
        'any.required': 'Country is required',
      }),
      imageUrls: Joi.array()
      .items(
        Joi.object({
          type: Joi.string()
            .required()
            .messages({
              'string.base': 'Image type must be a string',
              'any.required': 'Image type is required',
            }),
          url: Joi.string()
            .uri()
            .required()
            .messages({
              'string.base': 'Image URL must be a string',
              'string.uri': 'Each image URL must be a valid URI',
              'any.required': 'Image URL is required',
            }),
        })
      )
      .default([])
      .messages({
        'array.base': 'Image URLs must be an array of objects',
        'object.base': 'Each item in image URLs must be an object',
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
    bestTimeToVisit: Joi.string()
      .optional(),
    isMajorHub: Joi.boolean()
      .optional(),
    pointsOfInterest: Joi.array()
      .items(Joi.string())
      .optional(),
    climate: Joi.string()
      .optional(),
    languageSpoken: Joi.string()
      .required()
      .messages({
        'string.base': 'Language spoken must be a string',
        'any.required': 'Language spoken is required',
      }),
    travelTimeFromHub: Joi.number()
      .optional(),
    isActive: Joi.boolean()
  }),

};

export default cityValidation;
