'use client';

import { useRef, useCallback, useEffect } from 'react';

/**
 * Returns a throttled version of `callback` that fires at most once every `ms` milliseconds.
 * Uses a trailing-edge strategy so the last call within the window is never lost.
 */
export function useThrottledCallback<T extends (...args: never[]) => void>(
  callback: T,
  ms: number,
): T {
  const lastCall = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestArgs = useRef<Parameters<T> | null>(null);
  const cbRef = useRef(callback);

  useEffect(() => {
    cbRef.current = callback;
  });

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      latestArgs.current = args;

      if (now - lastCall.current >= ms) {
        lastCall.current = now;
        cbRef.current(...args);
      } else if (!timer.current) {
        const remaining = ms - (now - lastCall.current);
        timer.current = setTimeout(() => {
          lastCall.current = Date.now();
          timer.current = null;
          if (latestArgs.current) cbRef.current(...latestArgs.current);
        }, remaining);
      }
    },
    [ms],
  ) as T;
}
