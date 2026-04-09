// === FILE: frontend/src/utils/api.js ===
import axios from 'axios';
import toast from 'react-hot-toast';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Response Interceptor: Handle global 401s
api.interceptors.response.use((response) => response, (error) => {
  if (error.response?.status === 401) {
    localStorage.removeItem('token');
    // We only want to alert if not already on login page
    if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
      toast.error('Session expired. Please log in again.');
      window.location.href = '/login';
    }
  }
  return Promise.reject(error);
});

export default api;
