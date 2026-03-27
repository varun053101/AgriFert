import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from './auth';

// ─── Axios Instance ───────────────────────────────────────────────────────────
const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request Interceptor ──────────────────────────────────────────────────────
// Auto-attach Bearer token to every request
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (err) => Promise.reject(err),
);

// ─── Response Interceptor ─────────────────────────────────────────────────────
// On 401: attempt silent token refresh then retry original request
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

const processQueue = (token: string) => {
  refreshQueue.forEach((resolve) => resolve(token));
  refreshQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = getRefreshToken();

      // If no refresh token, bail out immediately
      if (!refreshToken) {
        clearTokens();
        window.location.href = '/auth';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue the retry until refresh completes
        return new Promise((resolve) => {
          refreshQueue.push((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL ?? '/api'}/auth/refresh`,
          { refreshToken },
        );
        const { accessToken, refreshToken: newRefreshToken } = data.data;
        setTokens(accessToken, newRefreshToken);
        processQueue(accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch {
        clearTokens();
        window.location.href = '/auth';
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// ─── Type Interfaces ──────────────────────────────────────────────────────────
export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  isActive: boolean;
  createdAt: string;
}

export interface SoilCropData {
  cropType: string;
  soilType: string;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  soilMoisture: number;
  temperature: number;
  humidity: number;
}

export interface Recommendation {
  predictionId: string;
  fertilizer: {
    name: string;
    quantity: {
      nitrogen: number;
      phosphorus: number;
      potassium: number;
    };
    totalQuantity: number;
    unit: string;  // always "kg per acre"
  };
  yieldImprovement: {
    percentage: number;
    bushelsPerAcre: number | null; // null for Cotton & Sugarcane (not measured in bushels)
  };
  soilHealthTips: string[];
  modelConfidence: number;
  processingMs: number;
}

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const authApi = {
  register: (payload: { name: string; email: string; password: string; adminKey?: string }) =>
    api.post<{ data: { user: User; accessToken: string; refreshToken: string } }>(
      '/auth/register',
      payload,
    ),

  login: (payload: { email: string; password: string }) =>
    api.post<{ data: { user: User; accessToken: string; refreshToken: string } }>(
      '/auth/login',
      payload,
    ),

  logout: () => api.post('/auth/logout'),

  getMe: () => api.get<{ data: { user: User } }>('/auth/me'),

  refresh: (refreshToken: string) =>
    api.post<{ data: { accessToken: string; refreshToken: string } }>('/auth/refresh', {
      refreshToken,
    }),
};

// ─── Weather API ──────────────────────────────────────────────────────────────
export interface WeatherData {
  temperature: number;
  humidity: number;
  condition: string;
  description: string;
  city: string;
}

export const weatherApi = {
  getByLocation: (state: string, district: string) => {
    const params = new URLSearchParams({
      state: encodeURIComponent(state),
      ...(district ? { district: encodeURIComponent(district) } : {}),
    });
    return api.get<{ data: WeatherData }>(`/weather?${params.toString()}`);
  },

  getByCoords: (lat: number, lng: number) =>
    api.get<{ data: WeatherData }>(
      `/weather?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`,
    ),
};

// ─── Analyze API ──────────────────────────────────────────────────────────────
export const analyzeApi = {
  submit: (data: SoilCropData) => {
    // Map frontend field names → backend field names
    const payload = {
      soilType:    data.soilType,
      cropType:    data.cropType,
      temperature: data.temperature,
      humidity:    data.humidity,
      moisture:    data.soilMoisture,     // backend uses 'moisture'
      nitrogen:    data.nitrogen,
      potassium:   data.potassium,
      phosphorous: data.phosphorus,       // backend uses 'phosphorous'
    };
    return api.post<{ data: Recommendation }>('/analyze', payload);
  },

  getHistory: (page = 1, limit = 10) =>
    api.get(`/analyze/history?page=${encodeURIComponent(page)}&limit=${encodeURIComponent(limit)}`),

  getPrediction: (id: string) =>
    api.get(`/analyze/${encodeURIComponent(id)}`),
};

// ─── Admin API ────────────────────────────────────────────────────────────────
// Shape matches stats.service.js getAdminStats() exactly
export interface AdminStats {
  totalSubmissions: number;
  totalUsers: number;
  cropDistribution: { name: string; value: number }[];
  fertilizerUsage: { name: string; usage: number }[];
  yieldTrends: { month: string; yield: number; count: number }[];
  modelMetrics: {
    modelVersion: string | null;
    predictions: number;
    accuracy: number | null;
    lastUpdate: string | null;
  };
  averageTemperature: number;
  averageHumidity: number;
  averageMoisture: number;
  averageNPK: { n: number; p: number; k: number };
  averageYieldImprovement: number;
}

export const adminApi = {
  getStats: () => api.get<{ data: AdminStats }>('/admin/stats'),

  getPredictions: (page = 1, limit = 20, cropType?: string) => {
    const params = new URLSearchParams({
      page: encodeURIComponent(page),
      limit: encodeURIComponent(limit),
    });
    if (cropType) params.set('cropType', encodeURIComponent(cropType));
    return api.get(`/admin/predictions?${params.toString()}`);
  },

  getUsers: (page = 1, limit = 20) =>
    api.get(
      `/admin/users?page=${encodeURIComponent(page)}&limit=${encodeURIComponent(limit)}`,
    ),

  deactivateUser: (id: string) =>
    api.patch(`/admin/users/${encodeURIComponent(id)}/deactivate`),
};

export default api;
