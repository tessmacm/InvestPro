const memoryCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 30000; // 30 seconds

export const cachedFetch = async (url: string, options: RequestInit = {}, maxAgeMs: number = CACHE_TTL_MS) => {
  const isGet = !options.method || options.method.toUpperCase() === "GET";

  if (isGet) {
    const cached = memoryCache.get(url);
    const now = Date.now();
    if (cached && now - cached.timestamp < maxAgeMs) {
      return {
        ok: true,
        status: 200,
        json: async () => cached.data,
        isFromCache: true
      };
    }
  }

  const response = await fetch(url, options);

  if (isGet && response.ok) {
    try {
      const cloned = response.clone();
      const data = await cloned.json();
      memoryCache.set(url, { data, timestamp: Date.now() });
    } catch {
      // Ignore JSON parse errors for non-JSON responses
    }
  } else if (!isGet && response.ok) {
    // Invalidate memory cache on any mutation (POST/PUT/DELETE)
    memoryCache.clear();
  }

  return response;
};

export const invalidateApiCache = (urlPrefix?: string) => {
  if (urlPrefix) {
    for (const key of memoryCache.keys()) {
      if (key.includes(urlPrefix)) {
        memoryCache.delete(key);
      }
    }
  } else {
    memoryCache.clear();
  }
};
