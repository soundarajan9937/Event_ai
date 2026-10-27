
import axios from 'axios';

// Sanitize backend API URL and strip accidental copy-paste artifacts like 'Copy URL'
const sanitizeApiUrl = (url) => {
  const fallback = 'https://event-backend-ch59.onrender.com/api';
  if (!url || typeof url !== 'string') {
    return fallback;
  }

  let cleaned = url
    // Strip surrounding quotes
    .replace(/^['"]+|['"]+$/g, '')
    // Strip accidental 'Copy URL' button text or encoded variants from dashboard copy-paste
    .replace(/%20Copy%20URL|Copy%20URL|CopyURL/gi, '')
    // Trim whitespace
    .trim()
    // Remove any trailing slashes
    .replace(/\/+$/, '');

  if (!cleaned) {
    return fallback;
  }

  // Ensure /api is appended if omitted
  if (!cleaned.endsWith('/api')) {
    cleaned = `${cleaned}/api`;
  }

  // Deduplicate if ending with /api/api
  cleaned = cleaned.replace(/\/api\/api$/, '/api');

  return cleaned;
};

// Backend API URL
const API_BASE_URL = sanitizeApiUrl(import.meta.env.VITE_API_URL);

// Create Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Attach JWT token to requests when available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Handle API responses and errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || '';

    // Clear an expired session for protected requests only
    const isAuthEndpoint =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register');

    if (status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }

    return Promise.reject(error);
  }
);

// Search for real upcoming events
export const searchRealEvents = (
  city,
  eventType,
  page = 1
) => {
  const params = new URLSearchParams();

  params.set('city', city || '');
  params.set('event', eventType || 'all');
  params.set('page', String(page));

  return api.get(`/events/search?${params.toString()}`);
};

export default api;
