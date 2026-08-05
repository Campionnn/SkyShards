import { useEffect, useState } from "react";

export interface AsyncData<T> {
  data: T;
  loading: boolean;
  error: string | null;
}

/**
 * Load something once on mount, exposing `{data, loading, error}`.
 *
 * `fetcher` is deliberately not in the dependency array — these hooks are all called
 * with an inline arrow, so depending on its identity would refetch on every render.
 * The trade-off is that this only ever loads once per mount, which is exactly what
 * every current caller wants.
 *
 * A load that resolves after unmount is dropped rather than setting state.
 */
export const useAsyncData = <T>(fetcher: () => Promise<T>, initial: T, errorMessage: string): AsyncData<T> => {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    fetcher()
      .then((result) => {
        if (!active) return;
        setData(result);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        console.error(`${errorMessage}:`, err);
        setError(err instanceof Error ? err.message : errorMessage);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, loading, error };
};
