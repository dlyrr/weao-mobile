import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getTransport, type WeaoSnapshot } from '../api/transport';
import type { Exploit, RobloxVersions } from '../api/types';

const CACHE_KEY = 'weao.snapshot.v1';

interface DataContextValue {
  exploits: Exploit[];
  versions: RobloxVersions;
  /** True only for the very first load with nothing cached to show. */
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  /** When the currently displayed data was fetched, or null if never. */
  fetchedAt: number | null;
  /** True when the shown data came from disk and no live fetch has landed yet. */
  stale: boolean;
  refresh: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = useState<WeaoSnapshot | null>(null);
  const [stale, setStale] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Show last session's data instantly, then let the transport replace it.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(CACHE_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        setSnapshot((current) => {
          if (current) return current; // a live fetch already beat us here
          setStale(true);
          return JSON.parse(raw) as WeaoSnapshot;
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const transport = getTransport();
    return transport.subscribe(
      (next) => {
        setSnapshot(next);
        setStale(false);
        setError(null);
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(next)).catch(() => {});
      },
      (err) => {
        setError(err instanceof Error ? err.message : 'Could not reach WEAO.');
      },
    );
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await getTransport().refresh();
    } catch {
      // The error listener above has already surfaced the message.
    } finally {
      setRefreshing(false);
    }
  }, []);

  const value = useMemo<DataContextValue>(
    () => ({
      exploits: snapshot?.exploits ?? [],
      versions: snapshot?.versions ?? {},
      loading: snapshot === null,
      refreshing,
      error,
      fetchedAt: snapshot?.fetchedAt ?? null,
      stale,
      refresh,
    }),
    [snapshot, refreshing, error, stale, refresh],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useWeaoData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useWeaoData must be used inside <DataProvider>');
  return ctx;
}
