# Change log

One line per meaningful change, newest last. The detail lives in
`docs/changes/`; this file exists so a future agent can see the shape of the
project's history without opening five documents.

| ID | Date | Change | Document |
|---|---|---|---|
| CHANGE-001 | 2026-09-14 | Resume registry — versioned resumes, content-addressed uploads, rollback API, DOCX attaches to the active version rather than creating a second | [`CHANGE-2026-09-14-resume-registry.md`](changes/CHANGE-2026-09-14-resume-registry.md) |
| CHANGE-002 | 2026-09-14 | Admin security batch — explicit `ADMIN_LOCAL_BYPASS`, edge middleware, rate limiting on every admin write, real optimistic concurrency (the 409 could never previously fire), origin checks, server-side-only credentials | [`CHANGE-2026-09-14-admin-security.md`](changes/CHANGE-2026-09-14-admin-security.md) |
| CHANGE-003 | 2026-09-14 | Content layer — profile, social links and skills become admin-editable; registry-driven content API; resume version UI with rollback; Phase 1 UAT | [`CHANGE-2026-09-14-content-layer.md`](changes/CHANGE-2026-09-14-content-layer.md) |

## Architecture decisions

| ID | Decision | Document |
|---|---|---|
| ADR-001 | Content architecture — git-as-CMS over a database for Phase 1 | [`ADR-001-content-architecture.md`](adr/ADR-001-content-architecture.md) |

## Where to start

`docs/architecture.md` — it is written to be read first, and §8 ("What must NOT
be changed") and §10 ("Known limitations and open defects") are the two sections
that will save the most time.
