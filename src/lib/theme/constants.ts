import type { ColorMode, FontSetId, ThemeId } from '@/types';

export const STORAGE_KEYS = {
  theme: 'ag.theme',
  mode: 'ag.mode',
  font: 'ag.font',
} as const;

export const DEFAULT_THEME: ThemeId = 'engineering';
export const DEFAULT_MODE: ColorMode = 'dark';
export const DEFAULT_FONT: FontSetId = 'precision';

const THEME_IDS: readonly ThemeId[] = ['enterprise', 'engineering', 'studio'];
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
var themes=['enterprise','engineering','studio'];
var modes=['light','dark'];
var fonts=['precision','technical','editorial'];
if(themes.indexOf(t)===-1){t='${DEFAULT_THEME}';}
if(modes.indexOf(m)===-1){
  m = t==='engineering' ? 'dark' : 'light';
  if(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches&&t!=='studio'){m='dark';}
}
if(fonts.indexOf(f)===-1){f='${DEFAULT_FONT}';}
d.setAttribute('data-theme',t);
d.setAttribute('data-mode',m);
d.setAttribute('data-font',f);
d.classList.remove('no-js');
}catch(e){
  document.documentElement.setAttribute('data-theme','${DEFAULT_THEME}');
  document.documentElement.setAttribute('data-mode','${DEFAULT_MODE}');
  document.documentElement.setAttribute('data-font','${DEFAULT_FONT}');
  document.documentElement.classList.remove('no-js');
}})();`;
