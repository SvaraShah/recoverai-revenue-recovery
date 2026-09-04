import { useState, useEffect, useCallback } from "react";

interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const clientCache = new Map<string, { data: any; timestamp: number }>();

export function useFetch<T>(
  fetchFn: () => Promise<T>,
  deps: unknown[] = [],
  cacheKey?: string
): UseFetchResult<T> {
  const key = cacheKey || JSON.stringify(deps);
  const cached = clientCache.get(key);

  const [data, setData] = useState<T | null>(cached ? cached.data : null);
  const [loading, setLoading] = useState<boolean>(!cached);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    // If we have cached data, keep loading false so UI renders instantly while revalidating
    if (!clientCache.has(key)) {
      setLoading(true);
    }
    setError(null);
    try {
      const result = await fetchFn();
      setData(result);
      clientCache.set(key, { data: result, timestamp: Date.now() });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
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
