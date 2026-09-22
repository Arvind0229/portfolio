import { siteSettings } from '@/data/site-settings';
import type { ColorMode, FontSetId, ThemeId } from '@/types';

export const STORAGE_KEYS = {
  theme: 'ag.theme',
  mode: 'ag.mode',
  font: 'ag.font',
  /**
   * Motion override. Only ever `'full'` or absent.
   *
   * There is no stored `'reduced'`: anyone who wants less motion already has
   * the OS switch, and a second place to say the same thing is a second place
   * for the two to disagree. This exists for the opposite case — a visitor
   * whose OS reports `prefers-reduced-motion` without their having meant it,
   * which is what Windows does under "adjust for best performance".
   */
  motion: 'ag.motion',
} as const;

/*
 * The first-visit defaults come from `site-settings.json`, which the admin
 * panel's Site tab writes. A visitor's own stored choice always wins.
 */
const FORCED_MODE: ColorMode | null =
  siteSettings.defaultMode === 'auto' ? null : siteSettings.defaultMode;

export const DEFAULT_THEME: ThemeId = siteSettings.defaultTheme;
export const DEFAULT_MODE: ColorMode =
  FORCED_MODE ?? (DEFAULT_THEME === 'clay' || DEFAULT_THEME === 'studio' ? 'light' : 'dark');
export const DEFAULT_FONT: FontSetId = siteSettings.defaultFont;

/*
 * `enterprise` is kept, and it is now Crimson Claymorphism.
 *
 * The id is a storage key, not a name. Renaming it would invalidate every
 * saved preference and every `theme-option-enterprise` test selector to buy a
 * string nobody sees. `clay` is added rather than repurposing one of the
 * three, so a visitor who stored any existing value still lands on a theme
 * that exists.
 */
const THEME_IDS: readonly ThemeId[] = ['clay', 'engineering', 'studio', 'enterprise'];
const MODES: readonly ColorMode[] = ['light', 'dark'];
const FONT_IDS: readonly FontSetId[] = ['precision', 'technical', 'editorial'];

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && (THEME_IDS as readonly string[]).includes(value);
}

export function isColorMode(value: unknown): value is ColorMode {
  return typeof value === 'string' && (MODES as readonly string[]).includes(value);
}

export function isFontSetId(value: unknown): value is FontSetId {
  return typeof value === 'string' && (FONT_IDS as readonly string[]).includes(value);
}

/**
 * Runs synchronously in <head>, before first paint.
 *
 * Without this the page renders in the default theme and then swaps once
 * React hydrates — a visible flash and a jarring first impression. Reading
 * localStorage here is safe (wrapped in try/catch for private-mode browsers)
 * and costs well under a millisecond.
 *
 * Kept as a string so it can be inlined; it never imports anything.
 */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{
var d=document.documentElement;
var t=localStorage.getItem('${STORAGE_KEYS.theme}');
var m=localStorage.getItem('${STORAGE_KEYS.mode}');
var f=localStorage.getItem('${STORAGE_KEYS.font}');
var mo=localStorage.getItem('${STORAGE_KEYS.motion}');
var themes=['clay','engineering','studio','enterprise'];
var modes=['light','dark'];
var fonts=['precision','technical','editorial'];
if(themes.indexOf(t)===-1){t='${DEFAULT_THEME}';}
if(modes.indexOf(m)===-1){
  m = (t==='engineering'||t==='enterprise') ? 'dark' : 'light';
  if(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches&&t!=='studio'){m='dark';}
  ${FORCED_MODE ? `m='${FORCED_MODE}';` : ''}
}
if(fonts.indexOf(f)===-1){f='${DEFAULT_FONT}';}
d.setAttribute('data-theme',t);
d.setAttribute('data-mode',m);
d.setAttribute('data-font',f);
if(mo==='full'){d.setAttribute('data-motion','full');}else{d.removeAttribute('data-motion');}
d.classList.remove('no-js');
}catch(e){
  document.documentElement.setAttribute('data-theme','${DEFAULT_THEME}');
  document.documentElement.setAttribute('data-mode','${DEFAULT_MODE}');
  document.documentElement.setAttribute('data-font','${DEFAULT_FONT}');
  document.documentElement.classList.remove('no-js');
}})();`;
