import Joi from 'joi';

// Activity Schema
const activitySchema = Joi.object({
  _id: Joi.string()
    .required()
    .messages({
      'string.base': 'Activity ID must be a string',
      'any.required': 'Activity ID is required',
    }),
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

// City Schema
const citySchema = Joi.object({
  _id: Joi.string()
    .required()
    .messages({
      'string.base': 'City ID must be a string',
      'any.required': 'City ID is required',
    }),
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

const roomSchema = Joi.object({
  adults: Joi.number()
    .integer()
    .min(1)
    .required()
    .messages({
      'number.base': 'Number of adults in room must be a number',
      'number.integer': 'Number of adults in room must be an integer',
      'number.min': 'Number of adults in room must be at least 1',
      'any.required': 'Number of adults in room is required',
    }),
  children: Joi.number()
    .integer()
    .min(0)
    .required()
    .messages({
      'number.base': 'Number of children in room must be a number',
      'number.integer': 'Number of children in room must be an integer',
      'number.min': 'Number of children in room cannot be negative',
      'any.required': 'Number of children in room is required',
    }),
  childrenAges: Joi.array()
    .items(Joi.number().min(0))
    .messages({
      'array.base': 'Children ages must be an array of numbers',
      'array.items': 'Each child age must be a non-negative number',
    }),
});


// Itinerary Validation Schema
const itineraryValidation = {
  body: Joi.object().keys({
    country: Joi.string()
      .required()
      .messages({
        'string.base': 'Country must be a string',
        'any.required': 'Country is required',
      }),
    tripDuration: Joi.string()
      .required()
      .messages({
        'string.base': 'Trip duration must be a string',
        'any.required': 'Trip duration is required',
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
    rooms: Joi.array()
      .items(roomSchema)
      .required()
      .messages({
        'array.base': 'Rooms must be an array',
        'array.items': 'Each room must follow the defined schema',
        'any.required': 'Rooms are required',
      }),
  }),
};

export default itineraryValidation;
