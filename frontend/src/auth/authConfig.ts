declare global {
  interface Window {
    __ENV__?: { VITE_API_BASE_URL?: string };
  }
}

export const API_BASE_URL =
  window.__ENV__?.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:8000";
