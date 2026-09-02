import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import {
  checkForUpdate,
  clearDownloads,
  currentVersion,
  downloadUpdate,
  installUpdate,
  updatesSupported,
  type UpdateInfo,
} from './index';

const LAST_CHECK_KEY = 'weao.updates.lastCheck';
const SKIPPED_KEY = 'weao.updates.skipped';

/** Automatic checks are throttled; GitHub allows 60 anonymous calls an hour. */
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

export type UpdateStage =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'uptodate'
  | 'error';

export interface UpdaterState {
  stage: UpdateStage;
  update: UpdateInfo | null;
  /** 0–1 while downloading. */
  progress: number;
  error: string | null;
  supported: boolean;
  version: string;
  check: (manual?: boolean) => Promise<void>;
  download: () => Promise<void>;
  install: () => Promise<void>;
  /** Hides the banner for this version without disabling checks. */
  skip: () => void;
}

/**
 * One shared updater for the whole app. Both the Settings panel and the
 * update banner read the same state, so the app checks once rather than once
 * per consumer, and only one of them can be mid-download.
 */
const UpdaterContext = createContext<UpdaterState | null>(null);

function useUpdaterState(): UpdaterState {
  const [stage, setStage] = useState<UpdateStage>('idle');
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const downloaded = useRef<Awaited<ReturnType<typeof downloadUpdate>> | null>(null);
  const inFlight = useRef(false);

  const supported = updatesSupported();

  const check = useCallback(
    async (manual = false) => {
      if (!supported || inFlight.current) return;

      if (!manual) {
        // Automatic checks respect the throttle; a manual tap never waits.
        const last = Number((await AsyncStorage.getItem(LAST_CHECK_KEY)) ?? 0);
        if (Date.now() - last < CHECK_INTERVAL_MS) return;
      }

      inFlight.current = true;
      setStage('checking');
      setError(null);
      try {
        const found = await checkForUpdate();
        await AsyncStorage.setItem(LAST_CHECK_KEY, String(Date.now()));

        if (!found) {
          setUpdate(null);
          setStage('uptodate');
          return;
        }

        // A version the user dismissed stays dismissed on automatic checks,
        // but a manual check always surfaces it again.
        if (!manual) {
          const skipped = await AsyncStorage.getItem(SKIPPED_KEY);
          if (skipped === found.version) {
            setStage('idle');
            return;
          }
        }

        setUpdate(found);
        setStage('available');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Update check failed.');
        setStage('error');
      } finally {
        inFlight.current = false;
      }
    },
    [supported],
  );

  const download = useCallback(async () => {
    if (!update) return;
    setStage('downloading');
    setProgress(0);
    setError(null);
    try {
      const file = await downloadUpdate(update, ({ bytesWritten, totalBytes }) => {
        setProgress(totalBytes > 0 ? bytesWritten / totalBytes : 0);
      });
      downloaded.current = file;
      setProgress(1);
      setStage('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed.');
      setStage('error');
    }
  }, [update]);

  const install = useCallback(async () => {
    if (!downloaded.current) return;
    try {
      await installUpdate(downloaded.current);
      // Control passes to the system installer here. If the user cancels, the
      // APK stays cached so a retry is instant.
    } catch (e) {
      setError(
        e instanceof Error
          ? `${e.message} You may need to allow installing unknown apps.`
          : 'Could not start the installer.',
      );
      setStage('error');
    }
  }, []);

  const skip = useCallback(() => {
    if (update) AsyncStorage.setItem(SKIPPED_KEY, update.version).catch(() => {});
    setUpdate(null);
    setStage('idle');
  }, [update]);

  // Check on launch, and again when the app returns to the foreground.
  useEffect(() => {
    if (!supported) return;
    void check(false);

    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void check(false);
    });
    return () => sub.remove();
  }, [check, supported]);

  // A cached APK from a previous session is stale once this build is running.
  useEffect(() => {
    clearDownloads();
  }, []);

  return useMemo(
    () => ({
      stage,
      update,
      progress,
      error,
      supported,
      version: currentVersion(),
      check,
      download,
      install,
      skip,
    }),
    [stage, update, progress, error, supported, check, download, install, skip],
  );
}

export function UpdaterProvider({ children }: { children: React.ReactNode }) {
  const value = useUpdaterState();
  return <UpdaterContext.Provider value={value}>{children}</UpdaterContext.Provider>;
}

export function useUpdater(): UpdaterState {
  const ctx = useContext(UpdaterContext);
  if (!ctx) throw new Error('useUpdater must be used inside <UpdaterProvider>');
  return ctx;
}
