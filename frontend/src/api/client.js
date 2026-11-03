import axios from 'axios';

const configuredApiUrl =
  import.meta.env.VITE_API_URL || 'https://pulseapi-mew9.onrender.com/api';
const normalizedApiUrl = configuredApiUrl.replace(/\/+$/, '');
const API_BASE_URL = /\/api$/i.test(normalizedApiUrl)
  ? normalizedApiUrl
  : `${normalizedApiUrl}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token from localStorage to outgoing requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('pulseapi_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept 401s to handle expired sessions
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Don't auto-clear if attempting login
      if (!error.config.url.includes('/auth/login') && !error.config.url.includes('/auth/register')) {
        localStorage.removeItem('pulseapi_token');
        localStorage.removeItem('pulseapi_user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/profile'),
  logout: () => api.post('/auth/logout'),
};

export const dashboardApi = {
  getSummary: () => api.get('/dashboard/summary'),
};

export const monitorsApi = {
  getAll: (params) => api.get('/monitors', { params }),
  getById: (id) => api.get(`/monitors/${id}`),
  create: (data) => api.post('/monitors', data),
  update: (id, data) => api.put(`/monitors/${id}`, data),
  togglePause: (id) => api.patch(`/monitors/${id}/toggle-pause`),
  delete: (id) => api.delete(`/monitors/${id}`),
  checkNow: (id) => api.post(`/monitors/${id}/check-now`),
};

export const incidentsApi = {
  getAll: (params) => api.get('/incidents', { params }),
  getById: (id) => api.get(`/incidents/${id}`),
  updateStatus: (id, data) => api.patch(`/incidents/${id}/status`, data),
};

export const statusPagesApi = {
  getUserPages: () => api.get('/status-pages'),
  create: (data) => api.post('/status-pages', data),
  delete: (id) => api.delete(`/status-pages/${id}`),
  getPublic: (slug) => api.get(`/status-pages/public/${slug}`),
};

export default api;
