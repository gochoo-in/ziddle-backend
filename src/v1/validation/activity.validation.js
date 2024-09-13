import Joi from 'joi';

const activityValidation = {
  body: Joi.object().keys({
    name: Joi.string()
      .min(2)
      .max(100)
      .required()
      .messages({
        'string.base': 'Activity name must be a string',
        'string.min': 'Activity name must be at least 2 characters long',
        'string.max': 'Activity name must be at most 100 characters long',
        'any.required': 'Activity name is required',
      }),
    duration: Joi.string()
      .required()
      .messages({
        'string.base': 'Duration must be a string',
        'any.required': 'Duration is required',
      }),
    description: Joi.string()
      .optional()
      .messages({
        'string.base': 'Description must be a string',
      }),
    opensAt: Joi.string()
      .required()
      .messages({
        'string.base': 'Opening time must be a string',
        'any.required': 'Opening time is required',
      }),
    closesAt: Joi.string()
      .required()
      .messages({
        'string.base': 'Closing time must be a string',
        'any.required': 'Closing time is required',
      }),
    cityName: Joi.string()
      .required()
      .messages({
        'string.base': 'City name must be a string',
        'any.required': 'City name is required',
      }),
    bestTimeToParticipate: Joi.string()
      .optional()
      .messages({
        'string.base': 'Best time to participate must be a string',
      }),
    physicalDifficulty: Joi.string()
      .valid('Easy', 'Moderate', 'Difficult')
      .required()
      .messages({
        'string.base': 'Physical difficulty must be a string',
        'any.required': 'Physical difficulty is required',
      }),
    requiredEquipment: Joi.array().items(Joi.string())
      .optional()
      .messages({
        'array.base': 'Required equipment must be an array of strings',
      }),
    ageRestriction: Joi.string()
      .optional()
      .messages({
        'string.base': 'Age restriction must be a string',
      }),
    localGuidesAvailable: Joi.boolean()
      .required()
      .messages({
        'boolean.base': 'Local guides available must be a boolean',
        'any.required': 'Local guides available is required',
      }),
    groupSize: Joi.string()
      .optional()
      .messages({
        'string.base': 'Group size must be a string',
      }),
    culturalSignificance: Joi.string()
      .optional()
      .messages({
        'string.base': 'Cultural significance must be a string',
      }),
    idealCompanionType: Joi.array().items(Joi.string())
      .optional()
      .messages({
        'array.base': 'Ideal companion type must be an array of strings',
      }),
    isFamilyFriendly: Joi.boolean()
      .required()
      .messages({
        'boolean.base': 'Is family friendly must be a boolean',
        'any.required': 'Is family friendly is required',
      }),
  }),
};

export default activityValidation;
