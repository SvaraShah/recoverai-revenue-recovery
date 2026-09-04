import { useState, useEffect, useCallback } from "react";

interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const clientCache = new Map<string, CacheEntry<any>>();
const CACHE_TTL_MS = 30000; // 30 seconds TTL

export function useFetch<T>(
  fetchFn: () => Promise<T>,
  deps: unknown[] = [],
  cacheKey?: string
): UseFetchResult<T> {
  // Generate a unique cache key based on explicit key OR function signature + stringified deps
  const key = cacheKey || `${fetchFn.toString().trim()}_${JSON.stringify(deps)}`;
  
  const getValidCached = (): T | null => {
    const entry = clientCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      clientCache.delete(key);
      return null;
    }
    return entry.data as T;
  };

  const initialCached = getValidCached();
  const [data, setData] = useState<T | null>(initialCached);
  const [loading, setLoading] = useState<boolean>(!initialCached);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    const validCached = getValidCached();
    // If no valid cache exists, set loading to true
    if (!validCached) {
      setLoading(true);
    }
    setError(null);

    try {
      const result = await fetchFn();
      setData(result);
      if (result !== undefined && result !== null) {
        clientCache.set(key, { data: result, timestamp: Date.now() });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch data";
      setError(message);
      // Keep existing data if available on error, but ensure error is surfaced
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ...deps]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function clearClientCache() {
  clientCache.clear();
}
