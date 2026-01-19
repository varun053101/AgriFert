const morgan = require("morgan");

// Compact format for production, detailed for dev
const format =
  process.env.NODE_ENV === "production"
    ? ':remote-addr :method :url :status :res[content-length] - :response-time ms'
    : "dev";

module.exports = morgan(format);
