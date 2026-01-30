const asyncHandler = require("../utils/asyncHandler");
const { successResponse } = require("../utils/response");
const AppError = require("../utils/AppError");
const weatherService = require("../services/weather.service");

// GET /api/weather?state=punjab&district=ludhiana
// GET /api/weather?lat=30.9&lng=75.8
const getWeather = asyncHandler(async (req, res) => {
  const { lat, lng, state, district } = req.query;

  let data;

  if (lat && lng) {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    if (isNaN(latNum) || isNaN(lngNum) ||
        latNum < -90 || latNum > 90 ||
        lngNum < -180 || lngNum > 180) {
      throw new AppError("Invalid coordinates provided.", 400);
    }

    data = await weatherService.getWeatherByCoords(latNum, lngNum);
  } else if (state) {
    data = await weatherService.getWeatherByLocation(state, district || "");
  } else {
    throw new AppError("Provide either (lat & lng) or state in the query parameters.", 400);
  }

  successResponse(res, 200, "Weather data fetched", data);
});

module.exports = { getWeather };
