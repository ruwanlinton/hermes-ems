import { apiClient } from "./client";
import type { AuthUser } from "../auth/AuthContext";

interface TokenResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export const authApi = {
  login: (username: string, password: string) =>
    apiClient.post<TokenResponse>("/auth/login", { username, password }),
};
