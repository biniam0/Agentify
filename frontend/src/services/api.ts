import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../config/api';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('authToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url as string | undefined;

    // Only redirect on 401 for non-login requests and when not already on /login
    if (
      status === 401 &&
      requestUrl &&
      !requestUrl.includes('/auth/login') &&
      window.location.pathname !== '/app/login'
    ) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/app/login';
    }

    return Promise.reject(error);
  }
);

export default api;

