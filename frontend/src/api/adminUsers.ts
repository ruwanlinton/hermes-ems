import { apiClient } from "./client";

export interface AdminUser {
  id: string;
  username: string;
  name: string | null;
  email: string | null;
  roles: string[];
}

export const ROLE_OPTIONS = ["admin", "creator", "marker", "viewer"] as const;

export const adminUsersApi = {
  list: () => apiClient.get<AdminUser[]>("/admin/users"),
  create: (data: { username: string; password: string; name?: string; email?: string; roles: string[] }) =>
    apiClient.post<AdminUser>("/admin/users", data),
  update: (id: string, data: { name?: string; email?: string; roles?: string[]; password?: string }) =>
    apiClient.patch<AdminUser>(`/admin/users/${id}`, data),
  delete: (id: string) => apiClient.delete(`/admin/users/${id}`),
};
