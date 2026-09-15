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

**G1** (analysis) and **G2** (project data layer + CRUD) are complete. G3
onwards is not started.

| Gate | Delivered |
|---|---|
| G1 | BRD, ADR-004, motion system, design research, AI context, restore point |
| G2 | `projects.json` + validator + accessor + registry entry; admin CRUD with create, edit, duplicate, delete, reorder, publish and feature; company / role / skill references |

## Where to start

`docs/architecture.md` — it is written to be read first, and §8 ("What must NOT
be changed") and §10 ("Known limitations and open defects") are the two sections
that will save the most time.
