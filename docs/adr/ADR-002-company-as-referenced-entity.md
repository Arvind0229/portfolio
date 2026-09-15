# ADR-002: Company is a referenced entity, not a field on a role

**Status:** Accepted · 2026-09-14
**Supersedes:** nothing. **Amends:** the content model in ADR-001, which assumed
every editable file stood alone.

---

## Context

`experience.ts` held each role together with a profile of the employer it was
at — company name, sector, description, and a line on why that context matters.
Two roles at one employer meant two copies of all of it.

That had not happened yet. It was about to: Arvind has been promoted once
already inside SBFC, and the shape a career takes is more roles than employers.

A second thing forced the question. The role descriptions come from his resume,
and the site's founding rule is that nothing may be said that the resume does
not support. The **company** profiles are not from the resume — a resume does
not describe its own employers — so they were written from each company's own
site and public reporting, with the sources named in a comment. One record
holding both meant one record with two different standards of evidence inside
it, and no way for a reader to tell which half was which.

## Decision

Companies are their own entity, keyed by id, referenced by roles.

```
src/data/companies.json    { "sbfc": { name, website, logo, location,
                                       industry, description, relevance } }
src/data/experience.json   [ { id, companyId, designation, … } ]
```

`experience.ts` joins them and exports the same `readonly ExperienceItem[]` it
always did.

### A dangling reference drops the role

A role whose `companyId` names a company that does not exist is **not rendered**.
It is not rendered with a blank employer, and no placeholder is substituted.

This is the part worth writing down, because it is the first relational failure
mode this content model has and the alternatives are each worse in a specific
way:

| Alternative | Why not |
|---|---|
| Render with an empty company name | The section headline becomes "RPA Developer at " and the card reads as broken to a recruiter. A visibly broken page is worse than a shorter one. |
| Substitute a placeholder ("Unknown company") | Invents a fact on a site whose entire premise is that it does not. |
| Throw at build time | One bad save takes the whole site down. The project's standing contract is validate-and-drop, precisely so that cannot happen. |

The role stays in `experience.json` and stays visible in the admin panel, which
shows a message in place saying it is not on the site and why. The failure is
recoverable and it is visible to the one person who can fix it.

## Consequences

**Good.** A company is described once. Its facts keep their own provenance.
Multiple roles under one employer cost one line each. A company can be corrected
without touching any role.

**Cost.** There is now a reference that can be wrong, which is a class of bug
this content model did not previously have. Mitigated three ways: the role form
offers a `<select>` of companies that exist rather than a text box, a dangling
reference is reported in the panel where it can be fixed, and a test asserts
every shipped role resolves.

**Ordering changed once, visibly.** Splitting `highlights` into
`responsibilities` and `achievements` necessarily reorders the joined list.
Achievements lead, because the first arrangement tried pushed "Delivered 80+
production automations single-handedly" from second to last and that is the line
a recruiter should read first. No line was added or dropped; a fixture captured
from the commit before the split asserts the set is identical.

**Not changed.** The public sections and the AI knowledge layer read the same
shape as before and were not modified. That was a requirement rather than a
happy outcome: `lib/ai/retrieval.ts` is the most carefully built code in the
repository and a structural refactor is not the moment to touch it.

## When to revisit

If a third entity needs to reference companies — say projects gaining a client —
or if roles ever need to be queried by company rather than listed, the join in
`experience.ts` stops being the right place and the question of a real database
reopens. ADR-001 lists the conditions that would reverse *that* decision; this
one does not meet any of them.
