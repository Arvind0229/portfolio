# Change: Smooth scrolling (Lenis)

## Date
2026-09-22 (CHANGE-013)

## Request
"Scroll animation ke liye Lenis kaisa rahega" → "okay kardo and baki kuch change mat krna existing me".

## Business Objective
Mouse-wheel scrolling on desktop feels eased and continuous, so the scroll-driven scenes read smoothly. Nothing else on the site changes.

## Current State
Native browser scrolling. All scroll scenes use CSS scroll-driven animations (`animation-timeline`), which follow whatever the scroll position is.

## Existing Components Reused
- Reduced-motion rule (`prefers-reduced-motion` + `data-motion='full'` opt-in), same check as ClickEffects.
- `siteSettings` + admin Site settings editor for the on/off switch.
- Existing `scroll-margin-top` on sections (Lenis anchors respect it).

## Gap
No wheel easing.

## Proposed Solution
`lenis@^1.3.26` (MIT, ~5 kB gz), loaded by dynamic import inside `SmoothScroll` (mounted in the root layout). Runs only when:
- the device has hover + a fine pointer (desktop mouse/trackpad — phones keep native momentum),
- reduced motion is off (or the visitor opted into full motion),
- the path is not `/admin`,
- `siteSettings.smoothScroll` is true (admin switch, default on).

Options: `lerp 0.12`, `autoRaf`, `anchors`, `allowNestedScroll`, `stopInertiaOnNavigate`.

## Alternatives Considered
- CSS `scroll-behavior: smooth` only — affects anchor jumps, not wheel feel.
- GSAP ScrollSmoother — heavier, commercial licence history, needs wrapper markup.
- Framer Motion — not used on this site; no need to add it.

## Why This Solution Was Selected
Smallest dependency that gives wheel easing without changing markup; CSS scroll timelines keep working because Lenis drives the real window scroll.

## Files/Components Affected
- `package.json`, `package-lock.json` — `lenis`
- `src/components/visuals/smooth-scroll.tsx` — new
- `src/app/layout.tsx` — mounts `<SmoothScroll />`
- `src/app/globals.css` — SMOOTH SCROLL block (Lenis' recommended CSS)
- `src/data/site-settings.{json,ts}`, `src/components/admin/content-editors.tsx` — `smoothScroll` switch
- `tests/unit/scenes-settings.test.ts`, `tests/e2e/smooth-scroll.spec.ts`

## Database/API Changes
None.

## Security Impact
None. No network calls; MIT package, no install scripts.

## Performance Impact
Lenis chunk loads only on desktop after hydration. Home first-load JS unchanged in the initial bundle (169 kB, shared 103 kB).

## Accessibility Impact
Off under reduced motion. Keyboard, focus and anchor scrolling still work; anchors keep the sticky-header offset.

## Compliance/Governance Impact
None.

## Testing Performed
- `tsc --noEmit`: clean. ESLint: clean.
- Vitest: 482 passed (one secret-scan test failed once against a dev `.next` build; passed 15/15 after a production build).
- Playwright `smooth-scroll.spec.ts`: Lenis present on desktop, wheel scrolls, anchor lands ≤ 220 px; absent on phones, under reduced motion and on /admin.

## Known, out of scope
A transient duplicate `#mission` section can appear briefly during hydration (seen without Lenis too: 8/96 samples vs 2/96 with Lenis). Track separately.

## Rollback Plan
Admin → Site settings → untick "Smooth scrolling" (no code change), or revert this commit (tag `pre-change-013`).

## Final Status
Implemented and tested locally. Not deployed.
