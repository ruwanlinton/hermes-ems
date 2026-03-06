import axios from "axios";
import { API_BASE_URL } from "../auth/authConfig";

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: { "Content-Type": "application/json" },
});

/**
 * Call this once after Asgardeo initializes to inject the token interceptor.
 */
export function setupAuthInterceptor(getAccessToken: () => Promise<string>) {
  apiClient.interceptors.request.use(async (config) => {
    try {
      const token = await getAccessToken();
      config.headers.Authorization = `Bearer ${token}`;
    } catch {
      // Token fetch failed — let the request go through (will get 401)
    }
    return config;
  });
}
