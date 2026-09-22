import raw from '@/data/site-settings.json';
import type { ColorMode, FontSetId, ThemeId } from '@/types';

/**
 * Site-wide defaults, editable from the admin panel's Site tab.
 *
 * These decide only what a **first-time** visitor sees. Anyone who has picked
 * a theme, mode or font keeps their own choice — it lives in their browser and
 * always wins over this file.
 *
 * `defaultMode: 'auto'` keeps the behaviour the site has always had: each theme
 * opens in its own intended mode (Midnight and Crimson dark, Clay and Studio
 * light). `'light'` or `'dark'` forces that mode for the first visit whatever
 * the theme.
 *
 * Validate-and-drop, like every other content file: an unknown value falls
 * back to the built-in default rather than breaking the first paint.
 */
export type DefaultMode = ColorMode | 'auto';

export interface SiteSettings {
  defaultTheme: ThemeId;
  defaultMode: DefaultMode;
  defaultFont: FontSetId;
  /** The robot buddies that peek and play across the page. On unless turned off. */
  robots: boolean;
  /** Every public page answers with the maintenance scene (503) while true. */
  maintenance: boolean;
  /** Lenis smooth wheel scrolling on desktop. On unless turned off. */
  smoothScroll: boolean;
}

export const THEME_CHOICES: readonly ThemeId[] = ['clay', 'engineering', 'studio', 'enterprise'];
export const MODE_CHOICES: readonly DefaultMode[] = ['auto', 'light', 'dark'];
export const FONT_CHOICES: readonly FontSetId[] = ['precision', 'technical', 'editorial'];

const FALLBACK: SiteSettings = {
  defaultTheme: 'engineering',
  defaultMode: 'auto',
  defaultFont: 'precision',
  robots: true,
  maintenance: false,
  smoothScroll: true,
};

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

export function parseSiteSettings(value: unknown): SiteSettings {
  const record = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
  return {
    defaultTheme: pick(record.defaultTheme, THEME_CHOICES, FALLBACK.defaultTheme),
    defaultMode: pick(record.defaultMode, MODE_CHOICES, FALLBACK.defaultMode),
    defaultFont: pick(record.defaultFont, FONT_CHOICES, FALLBACK.defaultFont),
    robots: typeof record.robots === 'boolean' ? record.robots : FALLBACK.robots,
    maintenance: record.maintenance === true,
    smoothScroll:
      typeof record.smoothScroll === 'boolean' ? record.smoothScroll : FALLBACK.smoothScroll,
  };
}

export const siteSettings: SiteSettings = parseSiteSettings(raw);
