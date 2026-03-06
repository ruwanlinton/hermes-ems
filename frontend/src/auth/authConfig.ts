declare global {
  interface Window {
    __ENV__?: {
      VITE_ASGARDEO_CLIENT_ID?: string;
      VITE_ASGARDEO_BASE_URL?: string;
      VITE_API_BASE_URL?: string;
    };
  }
}

const env = window.__ENV__ || {};

export const authConfig = {
  clientID: env.VITE_ASGARDEO_CLIENT_ID || import.meta.env.VITE_ASGARDEO_CLIENT_ID || "",
  baseUrl: env.VITE_ASGARDEO_BASE_URL || import.meta.env.VITE_ASGARDEO_BASE_URL || "",
  signInRedirectURL: window.location.origin,
  signOutRedirectURL: window.location.origin + "/login",
  scope: ["openid", "profile", "email"],
  resourceServerURLs: [
    env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
  ],
};

export const API_BASE_URL =
  env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
