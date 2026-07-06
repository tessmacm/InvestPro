/// <reference types="vite/client" />

const getApiBaseUrl = (): string => {
  const url = import.meta.env.VITE_API_URL;
  return url ? url.trim() : "";
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
