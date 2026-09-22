# Change log

One line per meaningful change, newest last. The detail lives in
`docs/changes/`; this file exists so a future agent can see the shape of the
project's history without opening five documents.

| ID | Date | Change | Document |
|---|---|---|---|
| CHANGE-001 | 2026-09-14 | Resume registry — versioned resumes, content-addressed uploads, rollback API, DOCX attaches to the active version rather than creating a second | [`CHANGE-2026-09-14-resume-registry.md`](changes/CHANGE-2026-09-14-resume-registry.md) |
| CHANGE-002 | 2026-09-14 | Admin security batch — explicit `ADMIN_LOCAL_BYPASS`, edge middleware, rate limiting on every admin write, real optimistic concurrency (the 409 could never previously fire), origin checks, server-side-only credentials | [`CHANGE-2026-09-14-admin-security.md`](changes/CHANGE-2026-09-14-admin-security.md) |
| CHANGE-003 | 2026-09-14 | Content layer — profile, social links and skills become admin-editable; registry-driven content API; resume version UI with rollback; Phase 1 UAT | [`CHANGE-2026-09-14-content-layer.md`](changes/CHANGE-2026-09-14-content-layer.md) |
| CHANGE-004 | 2026-09-14 | Phase 1 gap closure — appearance panel overflow, admin-managed profile photo, Company as a referenced entity, quiet admin entry in the footer | [`CHANGE-2026-09-14-phase1-gaps.md`](changes/CHANGE-2026-09-14-phase1-gaps.md) |
| CHANGE-006 | 2026-09-15 | Four visual identities — Light Clay (new `clay` id), Midnight, Studio mandala, Crimson Clay (`enterprise` kept); robot state machine gated to Midnight; clay interaction motion across every card and control | [`CHANGE-2026-09-15-four-themes.md`](changes/CHANGE-2026-09-15-four-themes.md) |
| CHANGE-005 | 2026-09-15 | The public case-study page — `ProjectDepth` gets a surface a visitor can read, seven new fields, record-level visibility with one enforcement point, related work by shared reference rather than file order | [`CHANGE-2026-09-15-case-study-page.md`](changes/CHANGE-2026-09-15-case-study-page.md) |
| CHANGE-007 | 2026-09-21 | Verified content (manpower workflow, multi-source MIS depth, New LOS and AutomationEdge as secondary, Agentic AI as *exploring*), reconciliation framing removed; G6-scroll — journey spine, section nodes, the manpower run as a scroll storyboard, amber on Midnight, parallax, magnetic CTAs; zero dependencies | [`CHANGE-2026-09-21-g6-scroll-and-content.md`](changes/CHANGE-2026-09-21-g6-scroll-and-content.md) |
| CHANGE-008 | 2026-09-21 | Mission journey — five of Arvind's images as a pinned, cross-fading scroll scene after the hero; Midnight-only, CSS-only, 441 KB of lazy WebP, never upscaled; stacked fallback for reduced motion, narrow screens and older browsers | [`CHANGE-2026-09-21-mission-journey.md`](changes/CHANGE-2026-09-21-mission-journey.md) |
| CHANGE-009 | 2026-09-21 | Phone scroll scenes pinned like desktop; landing and closing follow each theme (Midnight dark keeps the night frame); backdrop reacts to the mouse, moves more, bigger mandalas and bubbles; Midnight robot roams and hops; WhatsApp as green disc; lamp glows without filters | [`CHANGE-2026-09-21-mobile-scenes-reactive-backdrop.md`](changes/CHANGE-2026-09-21-mobile-scenes-reactive-backdrop.md) |
| CHANGE-010 | 2026-09-21 | Skills listed once (coloured and clickable); hover on every card; click effects on every button (download, WhatsApp, mail, get in touch, call, ripple); animated footer; word-by-word section titles; robot buddies (corner peeker, two chasers, hello / dizzy / smile / cry) on every theme and on phones, with an admin switch | [`CHANGE-2026-09-21-delight-pass.md`](changes/CHANGE-2026-09-21-delight-pass.md) |
| CHANGE-011 | 2026-09-21 | Error and state system (404 / 401 / 403 / 500 / 503 / offline / maintenance, route and global boundaries, loader, skeleton, route progress, offline notice, image fallback, empty state); real download progress; admin verification animation and validation; view-in-browser and get-in-touch buttons; real brand marks (Simple Icons, CC0); admin now edits impact figures, pillars, flows, skill notes, skill groups and maintenance mode | [`CHANGE-2026-09-21-states-admin-logos.md`](changes/CHANGE-2026-09-21-states-admin-logos.md) |
| CHANGE-012 | 2026-09-22 | Studio mandalas visible again: higher mandala opacity, lighter section bands on Studio | (commit b082067) |
| CHANGE-013 | 2026-09-22 | Lenis smooth scrolling on desktop mouse wheels (off on phones, under reduced motion, on /admin, and by admin switch); nothing else changed | [`CHANGE-2026-09-22-smooth-scroll.md`](changes/CHANGE-2026-09-22-smooth-scroll.md) |
| CHANGE-014 | 2026-09-22 | Admin save errors say why: a GitHub refusal (bad token, no repo access, wrong repo/branch, branch rule) is no longer reported as "changed somewhere else, reload" | [`CHANGE-2026-09-22-admin-save-errors.md`](changes/CHANGE-2026-09-22-admin-save-errors.md) |
| CHANGE-015 | 2026-09-22 | Stale-sha conflicts only when GitHub says so; any other refusal shows GitHub's reason (token-scrubbed) and is logged to Vercel; resume upload shows its result on the Resume tab and adds the new version to the list | [`CHANGE-2026-09-22-admin-save-errors.md`](changes/CHANGE-2026-09-22-admin-save-errors.md) |

## Architecture decisions

| ID | Decision | Document |
|---|---|---|
| ADR-001 | Content architecture — git-as-CMS over a database for Phase 1 | [`ADR-001-content-architecture.md`](adr/ADR-001-content-architecture.md) |
| ADR-002 | Company is a referenced entity, not a field on a role | [`ADR-002-company-as-referenced-entity.md`](adr/ADR-002-company-as-referenced-entity.md) |
| ADR-003 | The browser processes uploaded images; the server validates without decoding | [`ADR-003-client-side-image-processing.md`](adr/ADR-003-client-side-image-processing.md) |
| ADR-004 | Projects join the content layer; `ProjectDepth` gets a public surface; the id stays the URL | [`ADR-004-project-architecture.md`](adr/ADR-004-project-architecture.md) |

## Phase 2 (in progress)

| Document | What it is |
|---|---|
| [`AI-CONTEXT.md`](AI-CONTEXT.md) | Where the work stands, decisions not to reverse, mistakes already made here |
| [`BRD-PHASE-2.md`](BRD-PHASE-2.md) | Requirements, EXISTING→GAP→CHANGE per item, data model, wireframe, risks |
| [`MOTION-SYSTEM.md`](MOTION-SYSTEM.md) | Global vs theme-specific motion, tokens, robot states, Mandala layers |
| [`DESIGN-RESEARCH-PHASE-2.md`](DESIGN-RESEARCH-PHASE-2.md) | Principles taken from current practice, and what was deliberately not taken |

**G1**, **G2**, **G3** (implementation) and **G4/G5** (four themes + motion) are
built. G3 acceptance is still pending real case-study content and Arvind's UAT.
G6 (AI retrieval, performance, release) is not started.

| Gate | Delivered |
|---|---|
| G1 | BRD, ADR-004, motion system, design research, AI context, restore point |
| G2 | `projects.json` + validator + accessor + registry entry; admin CRUD with create, edit, duplicate, delete, reorder, publish and feature; company / role / skill references |
| G4/G5 | Four themes with strict signature isolation; robot state machine; generative mandala; crimson web geometry; clay interaction motion; 0 axe violations and 0 overflow across four themes × six widths |
| G3 | `case-study.tsx`; seven depth fields plus record-level visibility, through the parser, the admin form and the page; related work scored on shared references; 31 new tests including an end-to-end assertion that an internal record reaches neither the page nor retrieval |

## Where to start

`docs/architecture.md` — it is written to be read first, and §8 ("What must NOT
be changed") and §10 ("Known limitations and open defects") are the two sections
that will save the most time.
