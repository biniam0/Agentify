import api from './api';

export type PlatformRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  role: PlatformRole;
  tenantSlug: string;
  isEnabled: boolean;
  avatarUrl: string | null;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ListPlatformUsersResponse {
  success: boolean;
  users: PlatformUser[];
  total: number;
  limit: number;
  offset: number;
}

export interface ListPlatformUsersFilters {
  role?: PlatformRole;
  search?: string;
  limit?: number;
  offset?: number;
}

export const listPlatformUsers = async (
  filters?: ListPlatformUsersFilters
): Promise<ListPlatformUsersResponse> => {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (typeof value === 'string' && value.length === 0) return;
      params.append(key, String(value));
    });
  }
  const qs = params.toString();
  const response = await api.get<ListPlatformUsersResponse>(
    `/admin/users${qs ? `?${qs}` : ''}`
  );
  return response.data;
};

interface UpdateUserRoleResponse {
  success: boolean;
  user: PlatformUser;
  message?: string;
}

export const updateUserRole = async (
  id: string,
  role: PlatformRole
): Promise<UpdateUserRoleResponse> => {
  const response = await api.patch<UpdateUserRoleResponse>(`/admin/users/${id}/role`, { role });
  return response.data;
};
