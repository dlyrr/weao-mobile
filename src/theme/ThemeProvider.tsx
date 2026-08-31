import React, { createContext, useContext, useMemo } from 'react';
import { useSettings } from '../state/settings';
import { THEMES, THEME_META, type ThemeId, type ThemeMeta, type ThemeTokens } from './tokens';

interface ThemeContextValue {
  id: ThemeId;
  meta: ThemeMeta;
  c: ThemeTokens;
  setTheme: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings, update } = useSettings();
  const id = settings.theme;

  const value = useMemo<ThemeContextValue>(
    () => ({
      id,
      meta: THEME_META[id],
      c: THEMES[id],
      setTheme: (next: ThemeId) => update({ theme: next }),
    }),
    [id, update],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}

/** Shorthand for the common case of only needing colours. */
export function useColors(): ThemeTokens {
  return useTheme().c;
}
