/// <reference types="vite/client" />

const getApiBaseUrl = (): string => {
  // On web browsers, host-relative URLs are always safest and prevent pre-baked dev URL leakages
  if (typeof window !== "undefined" && window.location && window.location.origin) {
    const origin = window.location.origin;
    if (origin.startsWith("http://") || origin.startsWith("https://")) {
      return "";
    }
  }
  return import.meta.env.VITE_API_URL || "";
};

export const API_BASE_URL = getApiBaseUrl();
