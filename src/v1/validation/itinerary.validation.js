import Joi from 'joi';

const activitySchema = Joi.object({
  name: Joi.string()
    .required()
    .messages({
      'string.base': 'Activity name must be a string',
      'any.required': 'Activity name is required',
    }),
  duration: Joi.string()
    .required()
    .messages({
      'string.base': 'Activity duration must be a string',
      'any.required': 'Activity duration is required',
    }),
  category: Joi.string()
    .required()
    .messages({
      'string.base': 'Category must be a string',
      'any.required': 'Category is required',
    }),
  opensAt: Joi.string()
    .required()
    .messages({
      'string.base': 'Activity opening time must be a string',
      'any.required': 'Activity opening time is required',
    }),
  closesAt: Joi.string()
    .required()
    .messages({
      'string.base': 'Activity closing time must be a string',
      'any.required': 'Activity closing time is required',
    }),
});

const citySchema = Joi.object({
  name: Joi.string()
    .required()
    .messages({
      'string.base': 'City name must be a string',
      'any.required': 'City name is required',
    }),
  iataCode: Joi.string()
    .length(3)
    .pattern(/^[A-Z]{3}$/)
    .required()
    .messages({
      'string.base': 'IATA code must be a string',
      'string.length': 'IATA code must be exactly 3 characters long',
      'string.pattern.base': 'IATA code must be uppercase letters only',
      'any.required': 'IATA code is required',
    }),
  activities: Joi.array()
    .items(activitySchema)
    .required()
    .messages({
      'array.base': 'Activities must be an array',
      'array.items': 'Each activity must follow the defined schema',
      'any.required': 'Activities are required',
    }),
});

const itineraryValidation = {
  body: Joi.object().keys({
    country: Joi.string()
      .required()
      .messages({
        'string.base': 'Country must be a string',
        'any.required': 'Country is required',
      }),
    minNights: Joi.number()
      .integer()
      .min(0)
      .messages({
        'number.base': 'Minimum nights must be a number',
        'number.integer': 'Minimum nights must be an integer',
        'number.min': 'Minimum nights cannot be negative',
        'any.required': 'Minimum nights is required',
      }),
    tripDays: Joi.number()
      .integer()
      .min(1)
      .required()
      .messages({
        'number.base': 'Trip days must be a number',
        'number.integer': 'Trip days must be an integer',
        'number.min': 'Trip days must be at least 1',
        'any.required': 'Trip days are required',
      }),
    startDate: Joi.date()
      .iso()
      .required()
      .messages({
        'date.base': 'Start date must be a valid date',
        'any.required': 'Start date is required',
      }),
    travellingWith: Joi.string()
      .valid('friends', 'family', 'solo', 'couple')
      .required()
      .messages({
        'string.base': 'Travelling with must be a string',
        'string.valid': 'Travelling with must be one of the predefined values',
        'any.required': 'Travelling with is required',
      }),
    adults: Joi.number()
      .integer()
      .min(1)
      .required()
      .messages({
        'number.base': 'Number of adults must be a number',
        'number.integer': 'Number of adults must be an integer',
        'number.min': 'Number of adults must be at least 1',
        'any.required': 'Number of adults is required',
      }),
    children: Joi.number()
      .integer()
      .min(0)
      .required()
      .messages({
        'number.base': 'Number of children must be a number',
        'number.integer': 'Number of children must be an integer',
        'number.min': 'Number of children cannot be negative',
        'any.required': 'Number of children is required',
      }),
    cities: Joi.array()
      .items(citySchema)
      .required()
      .messages({
        'array.base': 'Cities must be an array',
        'array.items': 'Each city must follow the defined schema',
        'any.required': 'Cities are required',
      }),
  }),
};

export default itineraryValidation;
