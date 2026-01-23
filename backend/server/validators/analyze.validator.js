const Joi = require("joi");

const VALID_SOIL_TYPES = ["Black", "Sandy", "Red", "Loamy", "Clayey"];
const VALID_CROP_TYPES = ["Cotton", "Sugarcane", "Wheat", "Maize", "Paddy"];

const analyzeSchema = Joi.object({
  // Categorical — passed to ML encoder
  soilType: Joi.string()
    .valid(...VALID_SOIL_TYPES)
    .required()
    .messages({
      "any.only": `'soilType' must be one of: ${VALID_SOIL_TYPES.join(", ")}`,
      "any.required": "'soilType' is required",
    }),

  cropType: Joi.string()
    .valid(...VALID_CROP_TYPES)
    .required()
    .messages({
      "any.only": `'cropType' must be one of: ${VALID_CROP_TYPES.join(", ")}`,
      "any.required": "'cropType' is required",
    }),

  // Numeric features the model was trained on
  temperature:  Joi.number().min(-60).max(60).required().messages({
    "number.base": "'temperature' must be a number",
    "any.required": "'temperature' is required",
  }),
  humidity:     Joi.number().min(0).max(100).required().messages({
    "number.base": "'humidity' must be a number (0–100)",
    "any.required": "'humidity' is required",
  }),
  moisture:     Joi.number().min(0).max(100).required().messages({
    "number.base": "'moisture' must be a number (0–100)",
    "any.required": "'moisture' is required",
  }),
  nitrogen:     Joi.number().min(0).max(500).required().messages({
    "number.base": "'nitrogen' must be a number",
    "any.required": "'nitrogen' is required",
  }),
  potassium:    Joi.number().min(0).max(500).required().messages({
    "number.base": "'potassium' must be a number",
    "any.required": "'potassium' is required",
  }),
  phosphorous:  Joi.number().min(0).max(500).required().messages({
    "number.base": "'phosphorous' must be a number",
    "any.required": "'phosphorous' is required",
  }),

  // Optional location context (stored in DB, not sent to model)
  state:    Joi.string().trim().max(100).optional(),
  district: Joi.string().trim().max(100).optional(),
  coordinates: Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
  }).optional(),
});

module.exports = { analyzeSchema, VALID_SOIL_TYPES, VALID_CROP_TYPES };
