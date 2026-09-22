# Change: error pages, status states, loaders, button states, real logos, more admin

## Date

2026-09-21 (CHANGE-011)

## Request

Arvind's list for this change:

1. Can everything be updated from admin with no code change?
2. "View in browser" had no animation.
3. MFA sign-in should show a verification animation.
4. A proper loader, network-issue handling, skeletons and error handling, a funny 404, and a unique loader.
5. Button animations styled on his reference image (download with progress and success, verification, view in browser, get in touch), fitted to the theme.
6. Real logos, in exact brand colours, for the tools and links.
7. Everything editable from admin: add, update, delete, reorder, and roles or designations within the same company.
8. A full error and UI-state system:
   - Pages and boundaries: 404, 401, 403, 500, 503, offline, maintenance, the global and route error boundaries, loading and skeletons.
   - Failure states: form validation, download failed, verification failed and contact-form failed.
   - The error pages in their own dark, copper, glass style; everything else follows the theme.

He also pasted Framer Motion and lucide-react code and asked for them to be installed.

## Decision: no Framer Motion, no lucide-react

**Recommendation:** build the same motion in CSS and inline SVG. That is what the site already uses.

**Why:**

- The site already has one motion system. Its reduced-motion allow-list is a single place, and every effect honours it.
- Framer Motion would add roughly 30–40 kB of client JavaScript to the pages that use it.
- Everything in the reference (3D tilt, glow, progress ring, check draw, particles, floating shapes) is transforms, opacity and stroke-dash work, which CSS runs on the compositor.
- lucide-react would duplicate `components/icons.tsx`.

**Trade-off:** no Framer Motion programming model for future work. If Arvind still wants it, it can be added, but nothing on the page would look different.

**Impact:** no new dependency.

## Decision: brand marks are copied from Simple Icons, not drawn

- Seven marks come from Simple Icons v16.32 (CC0) and are inlined in `components/brand-icons.tsx`: WhatsApp, Gmail, Python, MySQL, PostgreSQL, UiPath and Git.
- LinkedIn, Oracle, the Microsoft products, AWS and OpenAI have had their marks removed from Simple Icons, so no openly licensed copy exists. Those keep text or this site's own icon, with LinkedIn tinted #0A66C2.
- A drawn look-alike would be worse than no logo.
- The marks add about 11 kB to the home page's first load (157 → 168 kB): path data does not compress well.

## Contact-form failure: not built

The site has no contact form. Contact is by mailto, phone and WhatsApp. A form needs an email-sending service and a key, and a form that shows "sent" without actually sending would be the fake success the brief rules out. The failure pattern is ready in `ErrorScene` and `field-error`, so it can be wired up once a service is chosen (Resend has a free tier).

## What was built

| State | Where | Notes |
|---|---|---|
| 404 | `app/not-found.tsx` | Real 404 status. "This page went for a coffee", with rotating jokes and a sad robot in a copper orb |
| 401 / 403 / 500 / 503 / offline / maintenance | `app/status/[code]` | Statically generated. Retry is offered only where it can help (500, 503, offline). An unknown code returns 404 |
| Maintenance mode | middleware + Site defaults checkbox | Every public page gets the maintenance scene with a real 503 and `Retry-After`. Admin and APIs stay reachable |
| Route error boundary | `app/error.tsx` | 500 scene with `reset()`. Shows only the opaque digest, never a message or stack |
| Global error boundary | `app/global-error.tsx` | The same scene with its own `<html>` and `<body>` |
| Loading | `app/loading.tsx` → `PipelineLoader` | A tiny automation run (a packet travels source → bot → report while the caption reads Fetching → Processing → Delivering), over a page skeleton |
| Route progress | `Resilience` | A thin bar on internal navigation |
| Offline / back online | `Resilience` | Uses the browser's own events. Never guesses |
| Broken image | `Resilience` | A calm "Image unavailable" pattern instead of the browser's broken icon |
| Empty state | `EmptyState` | A bot peeks out of a box. Used for the skills filter and the projects filter |
| Form validation | admin sign-in | Digits only, exactly six. Inline error, red ring and a shake |
| Verification | admin sign-in | Checking → Verifying → Verified with a drawn check and sparks. Verified shows only when the server accepts the code. Rate-limit and network failures each get their own message |
| Download | `DownloadButton` (hero, résumé) | Real progress read from the response stream. The ring spins when the size is unknown. "Downloaded!" appears only after the whole file arrives. On failure: a plain message, try again, or open the file directly. Still a plain `<a download>` without JavaScript |
| View in browser | résumé | Browser glyph plus ↗. The arrow lifts on hover and flies out on click |
| Get in touch | contact | Envelope icon, a rotating conic glow on hover, magnetic pull, and the spark burst on click |

## Admin coverage added

- **Impact tab:** figures (label, prefix, value, suffix, "out of", detail), the narrative line, achievements, expertise pillars and architecture flows. All can be added, edited, reordered and removed.
- **Skill notes tab:** the "what it is" and "why it gets used" text for every tool in the popup.
- **Skills tab:** groups can now be added, reordered and removed. A new group's id comes from its name.
- **Site defaults tab:** a maintenance mode switch.
- **Already covered before this change:** profile, photo, experience (companies, and any number of roles per company, each with its own designation, dates and display order), projects, résumé versions, project depth, scenes, and theme/mode/font defaults.
- **Still in code:**
  - The reporting showcase's sample tables.
  - The hero's live automation diagram.
  - Navigation labels.
  - The robots' lines.
  - The error pages' jokes.

## Testing

| Check | Result |
|---|---|
| tsc and ESLint (src) | clean |
| Vitest | 482 passed (12 new: the parsers accept both their file shape and their own output, and the status orb, empty state and error scene render correctly) |
| Build | OK. Shared JS 102 kB (unchanged). Home 168 kB (+11 kB, the brand marks). `/status/[code]` 110 kB. Middleware 34 kB |
| New `states.spec.ts` × 4 viewports | 404 status and copy, six status pages (no overflow), unknown code → 404, admin validation, failed and verified, download completed, download failed with retry, view-in-browser, offline notice, broken-image fallback, brand marks, and the admin Impact / notes / skills / maintenance controls |
| Admin, states and delight specs | 132 passed. Afterwards the click-effect test was updated because the hero download now has its own states (4/4) |
| Accessibility, responsive, visual and G6 specs | 172 passed |
| Journey, assistant, case-study, security, mission and flicker specs | 336 passed, 5 failed. Four were the change-009 WhatsApp test, which described the old green disc and was rewritten for the real mark (4/4). One was the hero count-up test at 768px under load (passes alone). |
| Admin editor test | Can fail when run in parallel with the other sign-in tests, because the login rate limit (a security feature) trips. Passes alone |

Screens were checked by eye:

- the 404 (desktop)
- the offline page (390px)
- maintenance (768px)
- 503
- résumé buttons (idle, hover, done, failed)
- Get in touch hover
- admin checking and verified

## Rollback

`git reset --hard pre-change-011` in the working copy the change was made in. To leave maintenance, untick the box and redeploy.
