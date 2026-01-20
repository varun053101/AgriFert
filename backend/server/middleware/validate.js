const { errorResponse } = require("../utils/response");

/**
 * Returns an Express middleware that validates req.body against a Joi schema.
 * On failure it responds with 422 and all field-level messages.
 */
const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, {
    abortEarly: false,   // collect all errors, not just the first
    stripUnknown: true,  // silently remove fields not in the schema
  });

  if (error) {
    const messages = error.details.map((d) => d.message.replace(/"/g, "'"));
    return errorResponse(res, 422, "Validation failed", messages);
  }

  next();
};

module.exports = validate;
