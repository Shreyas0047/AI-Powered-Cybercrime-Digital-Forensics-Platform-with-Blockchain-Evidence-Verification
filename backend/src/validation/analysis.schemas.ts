import Joi from 'joi';

export const analyzeUrlSchema = Joi.object({
  url: Joi.string().uri({ scheme: ['http', 'https'] }).required().max(2048).messages({
    'string.uri': 'URL must be a valid HTTP or HTTPS URL',
    'any.required': 'URL is required',
  }),
});

export const analysisHistoryQuery = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  type: Joi.string().valid('document_analysis', 'url_analysis', 'sandbox_behavioral').optional(),
});
