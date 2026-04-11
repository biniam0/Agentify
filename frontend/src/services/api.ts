import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../config/api';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: () => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown) => {
  failedQueue.forEach((p) => {
    if (error) p.reject(error);
    else p.resolve();
  });
  failedQueue = [];
};

const clearAuthAndRedirect = () => {
  const hadUser = !!localStorage.getItem('user');
  localStorage.removeItem('user');
  if (hadUser && window.location.pathname !== '/app/login') {
    window.location.href = '/app/login';
  }
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;
    const requestUrl = originalRequest?.url || '';

    const skipRefresh =
      status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/refresh') ||
      requestUrl.includes('/auth/logout');

    if (skipRefresh) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: () => resolve(api(originalRequest)),
          reject,
        });
      });
    }

    isRefreshing = true;
    originalRequest._retry = true;

    try {
      const res = await api.post('/auth/refresh');

      if (res.data?.success) {
        if (res.data.user) {
          localStorage.setItem('user', JSON.stringify(res.data.user));
        }
        processQueue(null);
        return api(originalRequest);
      }

      throw new Error('Refresh response invalid');
    } catch (refreshError) {
      processQueue(refreshError);
      clearAuthAndRedirect();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;

