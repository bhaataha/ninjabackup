'use client';

import { useState, useEffect, useCallback } from 'react';

type FetchState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

/**
 * Generic data-fetching hook with loading/error states and auto-refetch support.
 * 
 * Usage:
 * ```tsx
 * const { data, loading, error, refetch } = useFetch(() => agents.list());
 * ```
 */
export function useFetch<T>(
  fetcher: () => Promise<T>,
  deps: any[] = [],
  options?: { interval?: number; enabled?: boolean }
): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const enabled = options?.enabled !== false;

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    try {
      setLoading(true);
      setError(null);
      const result = await fetcher();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refetch interval
  useEffect(() => {
    if (!options?.interval || !enabled) return;
    const timer = setInterval(fetchData, options.interval);
    return () => clearInterval(timer);
  }, [fetchData, options?.interval, enabled]);

  return { data, loading, error, refetch: fetchData };
}
