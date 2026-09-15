# ADR-004: Projects join the content layer; depth gets a public surface

**Status:** Proposed · 2026-09-15 · awaiting G1 approval
**Builds on:** ADR-001 (git-as-CMS), ADR-002 (referenced entities), ADR-003
(client-side image processing)

> Filed at `docs/adr/` with the other ADRs rather than at the repository root
> path the directive named, so that all four sit together and `changelog.md`
> can index them uniformly.

---

## Context

`src/data/projects.ts` is a TypeScript literal holding five case studies. It is
the last large content file that requires a developer, a commit and a
deployment to change — which is the thing Phase 1 existed to remove everywhere
else.

Two facts from the inspection shape this decision more than that one does.

**First:** `ProjectDepth` already exists, is already admin-editable, and is
already indexed by the AI — and is **rendered on no page**. `grep` for
`project.depth` returns exactly one consumer, `src/lib/ai/knowledge.ts`. A
visitor cannot read a single word of it.

**Second:** `project-depth.json` contains `{"projects": {}}`. The feature has
never been used.

So the problem is not "projects need a better page". It is that the deep
content has nowhere to go, and consequently no reason to be written.

---

## Decision

### 1. Projects become a registry content file, like everything else

`projects.json` + `parseProjects` + accessor + one entry in
`src/lib/content/registry.ts`. That entry is what grants authentication, rate
limiting, the size cap, optimistic concurrency and conflict handling — there is
no second write path, and adding one would be the mistake ADR-001 was written
to prevent.

### 2. The id remains the URL. No slug field.

Five URLs exist today (`/projects/compliance-tracking` and four more) and are in
`generateStaticParams`. The id is already unique, URL-safe and stable, which is
the entire specification for a slug. A separate `slug` field would create two
identifiers to keep in sync and a migration to write, in exchange for nothing a
visitor can observe.

For a new project the id is derived from the title —
`lowercase → non-alphanumeric to hyphen → collapse → trim → 64 chars` — checked
for collision, and **frozen at creation**. The admin form shows it and does not
let it be edited afterwards.

Rejected: editable slugs with redirects. Redirect tables are a permanent
maintenance cost, and this is a five-page portfolio.

### 3. `ProjectDepth` is extended, never duplicated

The proposed Phase 2 schema contained `solution`, `technologies`,
`businessImpact` and `challenges`. All four already exist on `ProjectCaseStudy`
or `ProjectDepth` and are rendered today. Adding them again would produce two
places to edit one fact, and the failure mode is not a crash — it is a page
that quietly contradicts itself.

Added, because nothing holds them: `overview`, `businessProblem`,
`architecture[]`, `workflow[]`, `metrics[]`, `lessonsLearned[]`,
`futureEnhancements[]`, `visibility`.

`workflow` versus the existing `process` is the distinction worth stating:
**`process` is how the automation was built** (requirements, BRD, sign-off,
build, UAT, deploy); **`workflow` is what it does when it runs**. Both are
useful and they are not the same list.

`integrations` was proposed and is **not** being added, because the existing
`systems[]` already means "the applications, databases and interfaces it works
against". Two names for one fact is how a schema starts rotting.

### 4. Relationships point outward; they never copy

```
companies.json ──< experience.json ──< projects.json >── skills.json
```

A project stores `companyId`, `experienceIds[]`, `skillIds[]` and no copied
fields. This follows ADR-002.

**But the degradation rule differs from ADR-002, deliberately.** There, a role
whose company is missing is *dropped*, because a role with a blank employer
reads as broken. Here, a project whose company is missing **still renders**,
without the employer line. A project is a thing he built; the employer is
context. Losing the context is a smaller harm than hiding the work.

This asymmetry is the kind of thing a future reader would otherwise "fix" into
consistency, so it is recorded here as intentional.

### 5. Visibility is enforced at serialization, and confidential is refused

Each depth record carries `visibility: 'public' | 'internal'`. Internal content
is filtered out before it reaches a rendered page or a retrieval chunk, and a
test asserts that.

There is no `confidential` storage level. Credentials, tokens, PAN, PII and
customer data are not a class to be stored carefully — they must not enter the
repository at all, because **this repository is the database and its git
history is permanent**. A value committed and then deleted is still there.

The honest claim: this **reduces the risk of accidental public exposure**,
because internal fields are excluded from the public build and from retrieval,
subject to the filter being correct and the person classifying the field
correctly. It is not a guarantee, and this document will not make one.

---

## Consequences

**Good.** Projects become editable without a developer. Deep content gets a
public surface, which is the reason to write it. One source of truth per fact.
Relationships resolve through accessors already proven by the company split.

**Cost.** `projects.ts` becomes a join, as `experience.ts` already did — a
second place where a TypeScript literal turned into JSON plus a validator. The
pattern is now established rather than novel, which is the point of having done
it once.

**Cost.** Project data is now user input. It is validated on the way in and on
the way out, like every other content file, and the parser must never throw.

**Risk accepted.** The empty case-study page is a real possibility. Mitigated by
sequencing: Arvind populates one real project before the UI is judged.

---

## Alternatives considered

| Alternative | Why not |
|---|---|
| Leave `projects.ts` as code | It is the last file needing a developer, and the one most likely to change when he ships something new |
| A database | ADR-001's conditions for reversing have not been met: one author, low write volume, and the static build is what makes the site depend on nothing that can fail |
| Merge `ProjectCaseStudy` and `ProjectDepth` into one record | Tempting and wrong. The case study is the summary the card and the top of the page read; depth is optional long-form. Merging makes every consumer read a large object to show two lines |
| One `project-details.json` per the original proposal | Duplicates four existing fields. See §3 |
| Slug with redirects | See §2 |

---

## When to revisit

If project content ever needs to be queried rather than listed — "every project
using Python, across companies, ordered by year" — the build-time join stops
being the right shape and the database question reopens. Five projects is not
that. Fifty might be.
