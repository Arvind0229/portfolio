'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { themes } from '@/data/site';
import {
  DEFAULT_FONT,
  DEFAULT_MODE,
  DEFAULT_THEME,
  STORAGE_KEYS,
  isColorMode,
  isFontSetId,
  isThemeId,
} from '@/lib/theme/constants';
import type { ColorMode, FontSetId, ThemeId } from '@/types';

interface AppearanceState {
  theme: ThemeId;
  mode: ColorMode;
  font: FontSetId;
  setTheme: (theme: ThemeId) => void;
  setMode: (mode: ColorMode) => void;
  toggleMode: () => void;
  setFont: (font: FontSetId) => void;
  /**
   * True when the visitor has explicitly opted back into motion, overriding an
   * OS `prefers-reduced-motion` that they may not have meant to set.
   */
  fullMotion: boolean;
  setFullMotion: (full: boolean) => void;
  /** Whether the OS is currently asking for reduced motion at all. */
  systemReducedMotion: boolean;
  /** False until the client has read persisted values, to avoid SSR mismatch. */
  ready: boolean;
}

const AppearanceContext = createContext<AppearanceState | null>(null);

function persist(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private browsing or storage disabled — appearance still works for this
    // visit, it just is not remembered. Not worth surfacing to the visitor.
  }
}

function readAttribute(name: string): string | null {
  if (typeof document === 'undefined') return null;
  return document.documentElement.getAttribute(name);
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME);
  const [mode, setModeState] = useState<ColorMode>(DEFAULT_MODE);
  const [font, setFontState] = useState<FontSetId>(DEFAULT_FONT);
  const [ready, setReady] = useState(false);
  const [fullMotion, setFullMotionState] = useState(false);
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);

  // The inline bootstrap script has already set the attributes before paint;
  // this reads them back so React state matches the DOM rather than fighting it.
  useEffect(() => {
    const domTheme = readAttribute('data-theme');
    const domMode = readAttribute('data-mode');
    const domFont = readAttribute('data-font');
    if (isThemeId(domTheme)) setThemeState(domTheme);
    if (isColorMode(domMode)) setModeState(domMode);
    if (isFontSetId(domFont)) setFontState(domFont);

    // The bootstrap script has already applied the stored override before
    // paint; this only mirrors it into React state so the control renders in
    // the right position.
    setFullMotionState(document.documentElement.getAttribute('data-motion') === 'full');

    // Tracked live rather than read once: someone can change the OS setting
    // with the page open, and the control has to stop claiming the OS is
    // asking for reduced motion when it no longer is.
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setSystemReducedMotion(query.matches);
    sync();
    query.addEventListener('change', sync);

    setReady(true);

    return () => query.removeEventListener('change', sync);
  }, []);

  const setTheme = useCallback((next: ThemeId) => {
    setThemeState(next);
    document.documentElement.setAttribute('data-theme', next);
    persist(STORAGE_KEYS.theme, next);

    // Switching theme adopts that theme's intended mode unless the visitor has
    // explicitly chosen a mode for it before.
    let storedMode: string | null = null;
    try {
      storedMode = localStorage.getItem(`${STORAGE_KEYS.mode}.${next}`);
    } catch {
      storedMode = null;
    }
    const definition = themes.find((t) => t.id === next);
    const resolved: ColorMode = isColorMode(storedMode)
      ? storedMode
      : (definition?.defaultMode ?? DEFAULT_MODE);
    setModeState(resolved);
    document.documentElement.setAttribute('data-mode', resolved);
    persist(STORAGE_KEYS.mode, resolved);
  }, []);

  const setMode = useCallback(
    (next: ColorMode) => {
      setModeState(next);
      document.documentElement.setAttribute('data-mode', next);
      persist(STORAGE_KEYS.mode, next);
      persist(`${STORAGE_KEYS.mode}.${theme}`, next);
    },
    [theme],
  );

  const toggleMode = useCallback(() => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  }, [mode, setMode]);

  const setFullMotion = useCallback((full: boolean) => {
    setFullMotionState(full);
    const root = document.documentElement;
    if (full) {
      root.setAttribute('data-motion', 'full');
      persist(STORAGE_KEYS.motion, 'full');
    } else {
      // Removing the attribute hands the decision back to the OS, which is
      // why the stored value is cleared rather than set to 'system': absent
      // means "no opinion", and that is exactly what is meant.
      root.removeAttribute('data-motion');
      try {
        localStorage.removeItem(STORAGE_KEYS.motion);
      } catch {
        // Storage unavailable; the choice still applies for this visit.
      }
    }
  }, []);

  const setFont = useCallback((next: FontSetId) => {
    setFontState(next);
    document.documentElement.setAttribute('data-font', next);
    persist(STORAGE_KEYS.font, next);
  }, []);

  const value = useMemo<AppearanceState>(
    () => ({
      theme,
      mode,
      font,
      setTheme,
      setMode,
      toggleMode,
      setFont,
      fullMotion,
      setFullMotion,
      systemReducedMotion,
      ready,
    }),
    [
      theme,
      mode,
      font,
      setTheme,
      setMode,
      toggleMode,
      setFont,
      fullMotion,
      setFullMotion,
      systemReducedMotion,
      ready,
    ],
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance(): AppearanceState {
  const context = useContext(AppearanceContext);
  if (!context) {
    throw new Error('useAppearance must be used inside <AppearanceProvider>.');
  }
  return context;
}
