# Filling in your first case study

The page is built. It renders nothing extra right now because nothing has been
written — `project-depth.json` is empty. This is what to write, and where.

**Where:** admin panel → **Project depth** → pick a project. Save at the bottom.
Nothing here is required; a blank field means that section does not appear.

**One rule.** Write only what you can defend in an interview. If a number is an
estimate, say "approx." in the note. A blank field makes the assistant answer
"that is not in the profile", which is the answer you want it to give — the
alternative is it inventing something you then have to explain.

**Do not write into any of these:** customer names, employee names, account or
loan numbers, PAN, phone numbers, email addresses, file paths containing
customer data, server names, credentials, connection strings, or anything under
an NDA. The "internal" visibility switch keeps a record off the site and out of
the assistant — it does **not** make it safe to store. This repository is the
database and its history is permanent: a value committed and then deleted is
still there.

---

## What to write

| Field on the form | What it should say | Length |
|---|---|---|
| **Who can see this detail?** | Public unless there is a reason. Internal hides the whole block from the site and the assistant | — |
| **In one paragraph, what is this?** | What it is and who it is for, before any detail. First thing on the page | 2–4 sentences |
| **The business problem, in full** | The long form of the one-liner already on the card. Appears under the same heading | 3–6 sentences |
| **How is it put together?** | The pieces and how they relate. One per line | 3–6 lines |
| **What happens, step by step, when it runs?** | The run itself, in order. Different from the delivery process already on the page | 4–8 lines |
| **The numbers worth leading with** | Two to four. These sit at the top of the page | figure + label |
| **How big is it, how often does it run?** | Records, frequency, reach | 2–4 lines |
| **Which systems and databases?** | Applications, databases, portals, APIs | 2–6 lines |
| **How long, start to production?** | — | one line |
| **Who else was involved, and your part?** | — | 1–2 sentences |
| **How was this done before?** | — | 2–3 sentences |
| **What measurably changed after?** | — | 2–3 sentences |
| **When it fails at night, how do you find out?** | Monitoring, who looks, what happens | 2–3 sentences |
| **What was hard, and how did you solve it?** | Both halves. This is what interviewers push on | 1–3 entries |
| **Decisions you made, and why** | The reasoning is the signal, not the tool name | 1–3 entries |
| **What did building it teach you?** | Reads as experience rather than a feature list | 2–4 lines |
| **What would you do next with it?** | Plans, not claims — the heading says they are not built | 2–4 lines |
| **Anything else people ask you** | Write the question the way it gets asked | 1–3 entries |

---

## A worked shape, using made-up values

This is **not** about any of your projects — every value is invented so the
shape is clear. Do not copy any of it.

```
In one paragraph, what is this?
  A scheduled automation that checks <process> against <rule set> every
  <frequency> and raises an exception where a record does not comply, so the
  <team> reviews the exceptions instead of reading every record.

The numbers worth leading with
  figure:  6 hours a week      label: Manual review removed   note: approx.
  figure:  ~1,200              label: Records checked per run
  figure:  4                   label: Teams it reports to

How is it put together?
  Scheduler triggers the run on weekday mornings
  SQL extract pulls the day's records from <system>
  Rule engine evaluates each record and tags exceptions
  Mailer formats the exception list and sends it to the reviewers

What happens, step by step, when it runs?
  Pull the previous day's records
  Apply the rule set to each one
  Tag anything that fails a rule with the rule it failed
  Build the exception report
  Send it and archive a copy

Decisions you made, and why
  decision:      Front-end automation rather than a database write
  why:           The vendor exposed no API and the DB was read-only to us
  alternatives:  A nightly file drop, rejected because the turnaround was a day
```

Notice what the example does not do: it names no system, no team and no
customer. Yours can name internal systems if that is not sensitive in your
organisation — that is your call, not a default.

---

## After you save

The site rebuilds on the next deployment, not on save. Check the case-study page
and confirm every section reads the way you meant it. If a section looks thin,
the answer is to write more or leave it blank — never to round it up.
