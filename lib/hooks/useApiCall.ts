'use client';

import { useState, useCallback } from 'react';
import { useToast } from '@/components/ToastProvider';

interface UseApiCallOptions {
  successMsg?: string;
  errorMsg?: string;
  showToast?: boolean;
}

interface UseApiCallReturn<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  execute: (url: string, options?: RequestInit & UseApiCallOptions) => Promise<T | null>;
}

export function useApiCall<T = unknown>(): UseApiCallReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const execute = useCallback(
    async (url: string, options?: RequestInit & UseApiCallOptions): Promise<T | null> => {
      const { successMsg, errorMsg, showToast = true, ...fetchOptions } = options || {};

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(url, fetchOptions);
        const result = await response.json();

        if (!response.ok) {
          const errMessage = result?.error || errorMsg || 'Something went wrong';
          setError(errMessage);
          if (showToast) toast.error(errMessage);
          return null;
        }

        setData(result);
        if (showToast && successMsg) toast.success(successMsg);
        return result;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : errorMsg || 'Network error';
        setError(message);
        if (showToast) toast.error(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  return { data, error, isLoading, execute };
}
