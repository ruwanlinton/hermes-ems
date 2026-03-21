import { apiClient } from "./client";

export interface UserProfile {
  id: string;
  username: string;
  email: string | null;
  name: string | null;
  roles: string[];
}

export const usersApi = {
  getProfile: () => apiClient.get<UserProfile>("/users/me"),
  updateProfile: (data: { name: string }) =>
    apiClient.patch<UserProfile>("/users/me", data),
};
