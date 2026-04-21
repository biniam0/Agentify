import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export type FilterValues = Record<string, string[]>;

export interface UseFiltersResult {
  /** Current selection for each known filter id (always present, empty array if unset). */
  values: FilterValues;
  /** Number of active filters (ids with at least one selected value). */
  activeCount: number;
  /** Whether any filter has a selection. */
  hasActive: boolean;
  /** Replace the selected values for one filter. Pass [] to clear it. */
  setFilter: (id: string, values: string[]) => void;
  /** Toggle a single value within a filter (add if absent, remove if present). */
  toggleValue: (id: string, value: string) => void;
  /** Remove a single value from a filter. */
  removeValue: (id: string, value: string) => void;
  /** Clear a single filter entirely. */
  clearFilter: (id: string) => void;
  /** Clear all known filters at once. */
  clearAll: () => void;
}

/**
 * Hook that syncs a set of named multi-select filters with the URL query string.
 *
 * - Each filter is stored as a comma-separated list under its own query param,
 *   e.g. `?status=COMPLETED,FAILED&type=ZERO_SCORE`.
 * - Only params listed in `filterIds` are read or mutated; other query params
 *   (pagination, tabs, etc.) are left untouched.
 * - Values are kept as-is; caller is responsible for casing / encoding semantics.
 */
export function useFilters(filterIds: readonly string[]): UseFiltersResult {
  const [searchParams, setSearchParams] = useSearchParams();

  const idsKey = filterIds.join('|');

  const values = useMemo<FilterValues>(() => {
    const next: FilterValues = {};
    for (const id of filterIds) {
      const raw = searchParams.get(id);
      next[id] = raw
        ? raw
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean)
        : [];
    }
    return next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, idsKey]);

  const activeCount = useMemo(
    () => Object.values(values).filter((v) => v.length > 0).length,
    [values]
  );

  const writeParams = useCallback(
    (mutator: (params: URLSearchParams) => void) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          mutator(next);
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const setFilter = useCallback(
    (id: string, vals: string[]) => {
      writeParams((params) => {
        if (vals.length === 0) {
          params.delete(id);
        } else {
          params.set(id, vals.join(','));
        }
      });
    },
    [writeParams]
  );

  const toggleValue = useCallback(
    (id: string, value: string) => {
      const current = values[id] ?? [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      setFilter(id, next);
    },
    [values, setFilter]
  );

  const removeValue = useCallback(
    (id: string, value: string) => {
      const current = values[id] ?? [];
      setFilter(
        id,
        current.filter((v) => v !== value)
      );
    },
    [values, setFilter]
  );

  const clearFilter = useCallback(
    (id: string) => {
      setFilter(id, []);
    },
    [setFilter]
  );

  const clearAll = useCallback(() => {
    writeParams((params) => {
      for (const id of filterIds) params.delete(id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [writeParams, idsKey]);

  return {
    values,
    activeCount,
    hasActive: activeCount > 0,
    setFilter,
    toggleValue,
    removeValue,
    clearFilter,
    clearAll,
  };
}

export default useFilters;
