const router = require("express").Router();
const { getWeather } = require("../controllers/weather.controller");
const { authenticate } = require("../middleware/auth");

// Requires auth — keeps weather API key usage tied to real users
router.get("/", authenticate, getWeather);

module.exports = router;
