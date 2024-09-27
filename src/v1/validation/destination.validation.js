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
    description: Joi.string()
      .allow('')
      .max(500)
      .messages({
        'string.base': 'Description must be a string',
        'string.max': 'Description must be at most 500 characters long',
      }),
    category: Joi.string()
      .allow('')
      .messages({
        'string.base': 'Category must be a string',
      }),
    visaType: Joi.string()
      .required()
      .messages({
        'string.base': 'Visa type must be a string',
        'any.required': 'Visa type is required',
      }),
    country: Joi.string()
      .required()
      .messages({
        'string.base': 'Country must be a string',
        'any.required': 'Country is required',
      }),
    continent: Joi.string()
      .required()
      .messages({
        'string.base': 'Continent must be a string',
        'any.required': 'Continent is required',
      }),
    languagesSpoken: Joi.array()
      .items(Joi.string())
      .default([])
      .messages({
        'array.base': 'Languages spoken must be an array of strings',
      }),
    bestTimeToVisit: Joi.string()
      .allow('')
      .messages({
        'string.base': 'Best time to visit must be a string',
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
        'string.base': 'Latitude must be a string',
        'any.required': 'Latitude is required',
      }),
    longitude: Joi.number()
      .required()
      .messages({
        'string.base': 'Longitude must be a string',
        'any.required': 'Longitude is required',
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
      recommended: Joi.boolean(),

      active: Joi.boolean()
     
  }),
};

export default destinationValidation;
