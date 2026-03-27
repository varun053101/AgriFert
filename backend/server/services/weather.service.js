const axios = require("axios");
const AppError = require("../utils/AppError");

// Simple in-memory cache: { "key": { data, expiresAt } }
const cache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

const weatherClient = axios.create({
  baseURL: process.env.WEATHER_API_BASE,
  timeout: 8000,
});

const getCached = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
};

const setCache = (key, data) => {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
};

/**
 * Fetch current weather by geographic coordinates.
 */
const getWeatherByCoords = async (lat, lng) => {
  const cacheKey = `coords:${parseFloat(lat).toFixed(2)},${parseFloat(lng).toFixed(2)}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  let res;
  try {
    res = await weatherClient.get("/weather", {
      params: {
        lat,
        lon: lng,
        appid: process.env.WEATHER_API_KEY,
        units: "metric",
      },
    });
  } catch (err) {
    if (err.response?.status === 401) throw new AppError("Weather API key is invalid.", 500);
    if (err.response?.status === 404) throw new AppError("Location not found.", 404);
    throw new AppError("Weather service unavailable. Please enter values manually.", 503);
  }

  const data = formatWeatherResponse(res.data);
  setCache(cacheKey, data);
  return data;
};

/**
 * Fetch current weather by city/district + state name.
 * OpenWeatherMap accepts "district,state,IN" as a query.
 */
const getWeatherByLocation = async (state, district) => {
  const query = district ? `${district},${state},IN` : `${state},IN`;
  const cacheKey = `location:${query.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  let res;
  try {
    res = await weatherClient.get("/weather", {
      params: {
        q: query,
        appid: process.env.WEATHER_API_KEY,
        units: "metric",
      },
    });
  } catch (err) {
    if (err.response?.status === 404) throw new AppError(`Location "${query}" not found.`, 404);
    if (err.response?.status === 401) throw new AppError("Weather API key is invalid.", 500);
    throw new AppError("Weather service unavailable. Please enter values manually.", 503);
  }

  const data = formatWeatherResponse(res.data);
  setCache(cacheKey, data);
  return data;
};

const formatWeatherResponse = (raw) => ({
  temperature: Math.round(raw.main.temp),
  humidity:    raw.main.humidity,
  condition:   raw.weather[0]?.main || "Unknown",
  description: raw.weather[0]?.description || "",
  city:        raw.name,
});

module.exports = { getWeatherByCoords, getWeatherByLocation };
