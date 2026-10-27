import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 15000
});

// Request interceptor: Attach JWT token automatically if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Clean up expired sessions on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If unauthorized due to token expiration, clear token and cached user
      const isAuthEndpoint = error.config.url.includes('/auth/login') || error.config.url.includes('/auth/register');
      if (!isAuthEndpoint) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Search real upcoming events via our backend (which calls SerpApi server-side).
 * The SerpApi key is NEVER exposed to the frontend.
 *
 * @param {string} city        - e.g. "Coimbatore"
 * @param {string} eventType   - e.g. "Hackathon", "All Events", "Robotics"
 * @param {number} page        - e.g. 1
 */
export const searchRealEvents = (city, eventType, page = 1) => {
  const params = new URLSearchParams();
  params.set('city', city || '');
  params.set('event', eventType || 'all');
  if (page) params.set('page', page.toString());
  return api.get(`/events/search?${params.toString()}`);
};

export default api;
