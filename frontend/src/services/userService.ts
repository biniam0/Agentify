import api from './api';

export interface User {
  id: string;
  name: string;
  email: string;
  isAuth: boolean;
  isEnabled: boolean;
}

export interface UserResponse {
  success: boolean;
  user: User;
}

export interface ToggleResponse {
  success: boolean;
  isEnabled: boolean;
  message: string;
}

export const getCurrentUser = async (): Promise<UserResponse> => {
  const response = await api.get<UserResponse>('/user/me');
  return response.data;
};

export const toggleAutomation = async (isEnabled: boolean): Promise<ToggleResponse> => {
  const response = await api.patch<ToggleResponse>('/user/toggle-enabled', { isEnabled });
  return response.data;
};

