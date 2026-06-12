/// <reference types="vite/client" />

const getApiBaseUrl = (): string => {
  const url = import.meta.env.VITE_API_URL;
  return url ? url.trim() : "";
};

export const API_BASE_URL = getApiBaseUrl();
