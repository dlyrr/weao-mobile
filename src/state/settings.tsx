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
import { DEFAULT_THEME, type ThemeId } from '../theme/tokens';
import type { VersionPlatform } from '../api/types';

const STORAGE_KEY = 'weao.settings.v1';

export interface Settings {
  theme: ThemeId;
  /** Master switch — when off, nothing is scheduled at all. */
  notificationsEnabled: boolean;
  /** Per-platform Roblox client update alerts. */
  robloxUpdates: Record<VersionPlatform, boolean>;
  /** Keys from `exploitKey()` the user wants update alerts for. */
  watchedExploits: string[];
  /** Keys pinned to the top of their section. */
  pinnedExploits: string[];
  /** Reveals themes the site ships but doesn't list (currently Olemad). */
  showHiddenThemes: boolean;
  /** Rain particle budget, mirroring the site's low/medium/high quality tiers. */
  rainQuality: 'low' | 'medium' | 'high' | 'off';
  /** Compact rows instead of full cards — the site's "Show as list". */
  listView: boolean;
  /**
   * Frosted surfaces. Renders genuine Liquid Glass on iOS 26, and a blur
   * approximation elsewhere. Off falls back to flat themed surfaces.
   */
  glassSurfaces: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: DEFAULT_THEME,
  notificationsEnabled: false,
  robloxUpdates: { Windows: false, Mac: false, Android: false, iOS: false },
  watchedExploits: [],
  pinnedExploits: [],
  showHiddenThemes: false,
  rainQuality: 'high',
  listView: false,
  glassSurfaces: true,
};

interface SettingsContextValue {
  settings: Settings;
  /** True until the persisted settings have been read back. */
  hydrated: boolean;
  update: (patch: Partial<Settings>) => void;
  toggleWatched: (key: string) => void;
  togglePinned: (key: string) => void;
  setRobloxUpdate: (platform: VersionPlatform, enabled: boolean) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        const parsed = JSON.parse(raw) as Partial<Settings>;
        setSettings({
          ...DEFAULT_SETTINGS,
          ...parsed,
          // Merge rather than replace so a newly added platform keeps its default.
          robloxUpdates: { ...DEFAULT_SETTINGS.robloxUpdates, ...(parsed.robloxUpdates ?? {}) },
        });
      })
      .catch(() => {
        /* corrupt or missing settings fall back to defaults */
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced so rapid toggles don't thrash storage.
  useEffect(() => {
    if (!hydrated) return;
    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings)).catch(() => {});
    }, 150);
    return () => {
      if (writeTimer.current) clearTimeout(writeTimer.current);
    };
  }, [settings, hydrated]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const toggleWatched = useCallback((key: string) => {
    setSettings((prev) => ({
      ...prev,
      watchedExploits: prev.watchedExploits.includes(key)
        ? prev.watchedExploits.filter((k) => k !== key)
        : [...prev.watchedExploits, key],
    }));
  }, []);

  const togglePinned = useCallback((key: string) => {
    setSettings((prev) => ({
      ...prev,
      pinnedExploits: prev.pinnedExploits.includes(key)
        ? prev.pinnedExploits.filter((k) => k !== key)
        : [...prev.pinnedExploits, key],
    }));
  }, []);

  const setRobloxUpdate = useCallback((platform: VersionPlatform, enabled: boolean) => {
    setSettings((prev) => ({
      ...prev,
      robloxUpdates: { ...prev.robloxUpdates, [platform]: enabled },
    }));
  }, []);

  const value = useMemo(
    () => ({ settings, hydrated, update, toggleWatched, togglePinned, setRobloxUpdate }),
    [settings, hydrated, update, toggleWatched, togglePinned, setRobloxUpdate],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}

/** Read settings outside React — used by the background notification task. */
export async function readSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      robloxUpdates: { ...DEFAULT_SETTINGS.robloxUpdates, ...(parsed.robloxUpdates ?? {}) },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
