"use client";

import { useCallback, useEffect, useRef, useState, type DependencyList } from "react";
import { ApiError, toApiError } from "./api";

interface ResourceState<T> {
  data: T | null;
  error: ApiError | null;
  /** True only for a foreground load (first load, deps change, retry), never for polling. */
  loading: boolean;
}

export interface Resource<T> extends ResourceState<T> {
  /** Foreground reload: clears data so skeletons show. Used by Retry. */
  reload: () => void;
  /** Background refresh: keeps current data on screen. */
  refresh: () => void;
  /** Local (optimistic) update. */
  update: (updater: (data: T) => T) => void;
}

/**
 * Loads data, reloads when `deps` change, and optionally polls while the tab is visible.
 * Stale responses (from an older request) are ignored.
 */
export function useResource<T>(
  load: () => Promise<T>,
  deps: DependencyList,
  { pollMs }: { pollMs?: number } = {},
): Resource<T> {
  const [state, setState] = useState<ResourceState<T>>({ data: null, error: null, loading: true });
  const loadRef = useRef(load);
  const requestId = useRef(0);

  useEffect(() => {
    loadRef.current = load;
  });

  const run = useCallback(async (background: boolean) => {
    const id = ++requestId.current;
    if (!background) setState({ data: null, error: null, loading: true });
    try {
      const data = await loadRef.current();
      if (id === requestId.current) setState({ data, error: null, loading: false });
    } catch (err) {
      // A failed poll keeps the last good data on screen, with the error shown above it.
      if (id === requestId.current) setState((s) => ({ data: s.data, error: toApiError(err), loading: false }));
    }
  }, []);

  useEffect(() => {
    run(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (!pollMs) return;
    const tick = () => {
      if (document.visibilityState === "visible") run(true);
    };
    const timer = window.setInterval(tick, pollMs);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [pollMs, run]);

  return {
    ...state,
    reload: useCallback(() => run(false), [run]),
    refresh: useCallback(() => run(true), [run]),
    update: useCallback((updater: (data: T) => T) => {
      setState((s) => (s.data === null ? s : { ...s, data: updater(s.data) }));
    }, []),
  };
}
