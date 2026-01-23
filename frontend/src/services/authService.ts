import api from './api';
import { LoginResponse, User } from '../types';

export const login = async (email: string, password: string): Promise<LoginResponse> => {
  const response = await api.post<LoginResponse>('/auth/login', { email, password });
  return response.data;
};

export const setToken = (token: string): void => {
  localStorage.setItem('authToken', token);
};

export const getToken = (): string | null => {
  return localStorage.getItem('authToken');
};

export const setUser = (user: User): void => {
  localStorage.setItem('user', JSON.stringify(user));
};

export const getUser = (): User | null => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

export const logout = (): void => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
};

export const isAuthenticated = (): boolean => {
  return !!getToken();
};

export const isAdmin = (): boolean => {
  const user = getUser();
  return user?.email === 'tamiratkebede120@gmail.com';
};

export const getAuthHeader = (): { Authorization: string } | Record<string, never> => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
