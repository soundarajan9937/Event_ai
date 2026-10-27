
import axios from 'axios';

// Backend API URL
const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  'https://event-backend-ch59.onrender.com/api'
)
  .trim()
  .replace(/\/+$/, '');

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
