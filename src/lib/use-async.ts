"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "@/lib/api/client";

interface AsyncState<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  /** Re-runs the loader, keeping the previous data visible while it does. */
  reload: () => void;
}

interface Settled<T> {
  /** Which request produced this; compared against the current key. */
  key: string;
  data: T | null;
  error: ApiError | null;
}

/**
 * Runs an async loader and tracks its state.
 *
 * Deliberately small — a data-fetching library would be the right call for a
 * bigger app, but this needs three things: keep stale data visible during a
 * reload, discard responses that arrive out of order, and surface a typed error.
 *
 * `loading` is *derived* rather than stored: it is simply "what we have settled
 * does not match what was asked for". That removes the synchronous setState an
 * effect would otherwise need on every dependency change, and makes it
 * impossible for the flag to disagree with the data.
 *
 * @param deps values identifying the request; they are serialised, so pass
 *             primitives (an id, a query string), not objects with functions
 */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [reloadToken, setReloadToken] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);

  const key = `${reloadToken}:${JSON.stringify(deps)}`;

  // Kept current in an effect rather than assigned during render: writing to a
  // ref while rendering is impure, and React may render without committing.
  // Declared before the fetching effect so it has already run when that fires.
  const loaderRef = useRef(loader);
  useEffect(() => {
    loaderRef.current = loader;
  });

  useEffect(() => {
    let active = true;

    loaderRef
      .current()
      .then((data) => {
        // Guards against a slow earlier request resolving after a later one —
        // search fires on every filter change, so this happens routinely.
        if (active) setSettled({ key, data, error: null });
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setSettled({
          key,
          data: null,
          error:
            caught instanceof ApiError
              ? caught
              : new ApiError({ status: 500, detail: String(caught), code: "client_error" }),
        });
      });

    return () => {
      active = false;
    };
  }, [key]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  const isCurrent = settled?.key === key;

  return {
    // Stale data stays on screen while the next request is in flight, which
    // avoids the list collapsing to a skeleton on every filter tweak.
    data: settled?.data ?? null,
    error: isCurrent ? (settled?.error ?? null) : null,
    loading: !isCurrent,
    reload,
  };
}
