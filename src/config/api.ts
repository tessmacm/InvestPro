/// <reference types="vite/client" />

const DEFAULT_PROD_API = "https://investpro-api-eah3gdgnc2dmf9ah.canadacentral-01.azurewebsites.net";

const getApiBaseUrl = (): string => {
  const url = import.meta.env.VITE_API_URL;
  if (url && url.trim()) {
    return url.trim().replace(/\/+$/, '');
  }
  return DEFAULT_PROD_API;
};

export const API_BASE_URL = getApiBaseUrl();

/**
 * Returns the standard headers required for authenticated API calls.
 * Reads the JWT from localStorage/sessionStorage (matching authSlice storage logic).
 * Also passes x-user-role and x-user-id from the user object stored in session.
 */
export const authHeaders = (extraHeaders?: Record<string, string>): Record<string, string> => {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token") || "";
  const rawUser = localStorage.getItem("user") || sessionStorage.getItem("user") || "{}";
  let role = "";
  let userId = "";
  try {
    const u = JSON.parse(rawUser);
    role = u?.role || "";
    userId = u?.id || "";
  } catch { /* ignore */ }

  return {
    "Content-Type": "application/json",
    "Authorization": token ? `Bearer ${token}` : "",
    "x-user-role": role,
    "x-user-id": userId,
    ...extraHeaders,
  };
};
