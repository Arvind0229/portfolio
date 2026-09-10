import { projects } from '@/data/projects';
import { allSkills, skillGroups } from '@/data/skills';

/**
 * What each technology in the stack is, and why it earns a place in this kind
 * of work.
 *
 * ## The line this file does not cross
 *
 * Every note here describes the **technology**, not Arvind. "Power BI is
 * Microsoft's BI tool" is a public fact anyone can check. "He built fourteen
 * Power BI dashboards" is a claim about a person, and it would have to come
 * from the resume or not be said at all.
 *
 * So the personal half is never written here — it is **derived** at the bottom
 * of this file from `projects`, which is itself transcribed from the resume's
 * Key Projects section. `usedIn()` returns the case studies that actually list
 * the technology. If a skill appears in none of them, the panel says so rather
 * than reaching for a plausible sentence. That is the whole design: the half
 * that could be embellished is computed, so it cannot be.
 *
 * `why` answers "why would you pick this?" in the context of automating
 * lending operations — again a general statement about the tool, not a claim
 * about what was built with it.
 */

export interface SkillNote {
  /** What the technology is. Public, checkable, and about the tool only. */
  what: string;
  /** Why it is reached for in automation work. Also about the tool only. */
  why: string;
}

export const skillNotes: Readonly<Record<string, SkillNote>> = {
  /* ------------------------------ RPA ------------------------------ */
  'TruBot (Datamatics)': {
    what: 'A commercial RPA platform from Datamatics. Bots are assembled from pre-built activities in a visual designer, then scheduled and monitored from a central control room.',
    why: 'It drives applications through their own interfaces, so a process can be automated without waiting for the vendor to expose an API — which is often the only way into a core banking or lending system.',
  },
  'Automation Edge': {
    what: 'An RPA and IT-process-automation platform, usually deployed where automations need to reach across several back-office systems at once.',
    why: 'Its strength is orchestration: connecting a queue, a database and a downstream application into one run rather than three separate scripts nobody owns.',
  },
  'UiPath (Basic)': {
    what: "One of the most widely used RPA platforms. Marked basic here on purpose — it is working familiarity, not the depth held in TruBot.",
    why: 'It is the industry reference point. Knowing it means process designs and vocabulary transfer to most other RPA teams without relearning the concepts.',
  },
  'Intelligent Automation': {
    what: 'The step past rule-following: combining RPA with document understanding, OCR or decision logic so a process can handle inputs that are not perfectly structured.',
    why: 'Real lending paperwork is scanned, photographed and inconsistent. A bot that only handles clean input stops at the first exception.',
  },
  OCR: {
    what: 'Optical Character Recognition — turning an image of text, such as a scanned document, into text a program can read.',
    why: 'KYC and loan files arrive as scans. Without OCR the data has to be keyed in by a person, which is exactly the work automation is supposed to remove.',
  },
  'Queues & Triggers': {
    what: 'The scheduling layer of an RPA platform: a queue holds the work items, a trigger decides when a bot picks them up — on a clock, on a file arriving, or on a system event.',
    why: 'It is what turns a script into a service. Queues also give retry and audit for free, so a failed item is visible rather than silently lost.',
  },
  'RE Framework': {
    what: 'The Robotic Enterprise Framework — a standard project skeleton built around transaction queues, structured exception handling, retries and logging.',
    why: 'It answers the question that decides whether a bot survives: what happens when one item fails. Following it means exceptions are handled by design instead of discovered in production.',
  },
  'UI / Recorder-based Front-End Automation': {
    what: 'Automating an application by driving its actual interface — clicks, keystrokes and screen elements — rather than calling a service behind it.',
    why: 'Sometimes there is no back-end access to be had. This is the honest fallback, and it works, provided the selectors are built to survive a UI change.',
  },
  'Workflow & Business Process Automation': {
    what: 'Automating a whole process end to end — the hand-offs, approvals and system updates — rather than a single repetitive task inside it.',
    why: 'Automating one step of ten moves the bottleneck rather than removing it. The value shows up when the whole path from trigger to outcome runs unattended.',
  },

  /* -------------------------- Programming -------------------------- */
  SQL: {
    what: 'The query language every relational database speaks — reading, joining, filtering and aggregating data.',
    why: 'Most of what an operations automation does is fetch the right rows and reconcile them. Doing that in SQL is faster and far easier to verify than dragging the data through the bot first.',
  },
  'PL/SQL': {
    what: "Oracle's procedural extension to SQL: variables, loops, conditionals, stored procedures and cursors inside the database.",
    why: 'When logic belongs next to the data — a multi-step reconciliation, say — running it in the database beats pulling everything out and pushing the results back.',
  },
  Python: {
    what: 'A general-purpose programming language with a deep ecosystem for data handling, file manipulation and API work.',
    why: 'It is the escape hatch. When a drag-and-drop RPA step is the wrong tool — heavy calculation, an awkward file format, a real API call — Python does it in a few lines that can be tested.',
  },
  VBA: {
    what: 'Visual Basic for Applications — the scripting language built into Microsoft Office, most often used to automate Excel.',
    why: 'A great deal of finance still runs on workbooks. VBA reaches inside one and automates it in place, without asking the business to change how they work.',
  },

  /* ---------------------- Databases and cloud ---------------------- */
  Oracle: {
    what: 'An enterprise relational database, common as the system of record in banking and lending.',
    why: 'If the loan data lives in Oracle, the automation has to read Oracle. Its behaviour under load and its PL/SQL dialect are specific enough to count as their own skill.',
  },
  'MS SQL Server': {
    what: "Microsoft's enterprise relational database, widely used for reporting and line-of-business systems.",
    why: 'It is where a lot of MIS and operational reporting data sits, and it integrates tightly with Excel and Power BI at the other end of the pipeline.',
  },
  MySQL: {
    what: 'A widely deployed open-source relational database.',
    why: 'It shows up behind internal tools and smaller applications, so an automation that spans several systems usually has to speak it alongside the enterprise engines.',
  },
  PostgreSQL: {
    what: 'An open-source relational database known for standards compliance and strong support for complex queries and data types.',
    why: 'It handles analytical queries well, which makes it a natural home for consolidated or intermediate data on the way to a report.',
  },
  Redshift: {
    what: "Amazon's cloud data warehouse, built for analytical queries over large volumes rather than for transactions.",
    why: 'Reporting across a lot of history is the case it is designed for. Running that against the live transactional database instead is how you slow down the business.',
  },
  'Amazon S3': {
    what: "Amazon's object storage — durable buckets for files, rather than a filesystem or a database.",
    why: 'It is where generated reports, extracts and archives land. Durable, versioned and reachable from a scheduled job without a server sitting in between.',
  },
  'SFTP / FTP': {
    what: 'File transfer protocols. SFTP is the secure one, running over SSH; plain FTP is not encrypted.',
    why: 'Inter-system file exchange in banking still runs on this. Knowing the difference matters: regulated data has no business moving over plain FTP.',
  },

  /* ------------------------- Reporting / BI ------------------------ */
  'Power BI': {
    what: "Microsoft's business intelligence tool — connects to data sources and builds interactive reports and dashboards over them.",
    why: 'It closes the loop. Once a bot has consolidated the data, Power BI is what puts it in front of a manager in a form they can act on without asking for an extract.',
  },
  'Advanced Excel': {
    what: 'Excel past the basics: lookups, dynamic formulas, Power Query, and structured workbooks built to be refreshed rather than rebuilt.',
    why: 'Excel is the format the business actually opens. Automating the workbook they already use is usually a faster win than replacing it with something better.',
  },
  'Pivot Tables': {
    what: "Excel's summarisation tool — regrouping and aggregating a table across dimensions without writing a formula.",
    why: 'It is how an operations team slices a report themselves. Producing the underlying table in the right shape saves them the question of who to ask.',
  },
  'MIS & Dashboard Automation': {
    what: 'Generating and distributing management information reports on a schedule — extract, consolidate, calculate, format, deliver — with no one assembling them by hand.',
    why: 'Recurring reports are the clearest automation case there is: the same work, the same way, every cycle, and expensive in senior time when it is done manually.',
  },
  'HTML Mail-Body / Mailer Automation': {
    what: 'Building the report into the body of the email as formatted HTML, rather than attaching a file for the reader to download and open.',
    why: 'The report gets read. An attachment adds a step, and on a phone that step is often enough for it to be skipped entirely.',
  },

  /* --------------------- Integrations and tools -------------------- */
  'SMS API Integration': {
    what: 'Calling a messaging provider over HTTP so an application can send an SMS, with delivery status returned.',
    why: 'SMS reaches someone who is not at a desk and does not need an app installed — which is why regulated alerts and customer notifications still use it.',
  },
  'WhatsApp API Integration': {
    what: "Sending messages through WhatsApp's business platform, which uses pre-approved templates rather than free-form text.",
    why: 'It is where customers already are, and it supports richer content than SMS. The template approval step is a real constraint worth designing around up front.',
  },
  'AI-Assisted Development (ChatGPT, Claude)': {
    what: 'Using large language models as part of the development loop — drafting code, working through an approach, reviewing what was written.',
    why: 'It shortens the boring parts. Listed honestly because it changes how the work gets done, and because output still has to be read and tested like any other code.',
  },
  'Git (Basic)': {
    what: 'The version control system behind most software development — tracked history, branches, and a record of what changed and why.',
    why: 'Marked basic on purpose. Enough to keep work versioned and recoverable, which is the part that matters when an automation has to be rolled back.',
  },

  /* ------------------------- Business systems ---------------------- */
  LOS: {
    what: 'Loan Origination System — the platform a lender runs an application through, from lead and KYC to underwriting and sanction.',
    why: 'It is where a loan starts, so it is where most origination automation has to read from and write back to. Knowing the process it encodes matters more than knowing its screens.',
  },
  LMS: {
    what: 'Loan Management System — the platform that runs a loan after disbursement: repayments, servicing, delinquency and closure.',
    why: 'Collections and servicing reporting come from here. Together with the LOS it covers the whole life of a loan, which is the ground this work sits on.',
  },
  CRM: {
    what: 'Customer Relationship Management — the system holding customer records, interactions and follow-ups.',
    why: 'Automations that touch a customer usually have to leave a trace here, so the next person who speaks to them can see what already happened.',
  },
  ERP: {
    what: 'Enterprise Resource Planning — the back-office system covering finance, procurement and operations.',
    why: 'Reconciliation work ends up here, because it is the system the numbers are eventually checked against.',
  },
  Windows: {
    what: 'The operating system the bots, the schedulers and the applications they drive all run on.',
    why: 'Attended and unattended bots behave differently across sessions, permissions and locked screens. Those details decide whether a bot runs overnight or quietly does not.',
  },
};

/* ------------------------------------------------------------------ */
/* Derived — never authored                                            */
/* ------------------------------------------------------------------ */

/**
 * Names drift between files: the stack calls it `SQL`, a case study says
 * `Front-End / Recorder Automation` where the stack says
 * `UI / Recorder-based Front-End Automation`, and one project writes
 * `SMS API` for the stack's `SMS API Integration`. Rather than maintain a
 * synonym table that silently rots, both sides are reduced to comparable
 * token sets.
 *
 * Two details in here are the difference between this working and this
 * inventing history:
 *
 *   1. **A slash with spaces separates alternatives; a slash without them does
 *      not.** `SFTP / FTP` is two things, `PL/SQL` is one. Splitting on every
 *      slash turned `PL/SQL` into `{pl, sql}`, which then matched every case
 *      study that lists plain `SQL` — claiming PL/SQL work in five projects
 *      that never mention it.
 *   2. **A subset only counts when it has two or more tokens.** Otherwise any
 *      one-word technology would be swallowed by any longer name containing
 *      that word.
 *
 * Both were caught by the integrity tests, not by reading the output.
 */
const FILLER = new Set(['integration', 'automation', 'based', 'the', 'and', 'of']);

function alternatives(name: string): string[][] {
  return name
    .split(/\s+\/\s+|,/)
    .map((part) =>
      part
        .toLowerCase()
        .replace(/\([^)]*\)/g, '')
        // Join a slash that has no spaces around it, so `pl/sql` stays one word.
        .replace(/\//g, '')
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length > 0 && !FILLER.has(token)),
    )
    .filter((tokens) => tokens.length > 0);
}

function sameThing(a: string[], b: string[]): boolean {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size === setB.size && a.every((token) => setB.has(token))) return true;
  const [small, large] = setA.size <= setB.size ? [setA, setB] : [setB, setA];
  // A one-token subset is almost always a coincidence, not a synonym.
  if (small.size < 2) return false;
  return [...small].every((token) => large.has(token));
}

function matches(skill: string, technology: string): boolean {
  const left = alternatives(skill);
  const right = alternatives(technology);
  return left.some((a) => right.some((b) => sameThing(a, b)));
}

/** Case studies whose technology list includes this skill. Computed, so it
 *  cannot claim more than `src/data/projects.ts` does. */
export function usedIn(skill: string): ReadonlyArray<{ id: string; title: string }> {
  return projects
    .filter((project) =>
      project.technologies.some((technology) => matches(skill, technology)),
    )
    .map((project) => ({ id: project.id, title: project.title }));
}

/** The stack group a skill belongs to, for context in the panel. */
export function groupOf(skill: string): string | undefined {
  return skillGroups.find((group) => group.skills.includes(skill))?.name;
}

/** Every skill in the stack has a note. Asserted by a test, not by hope. */
export const skillsWithoutNotes: readonly string[] = allSkills.filter(
  (skill) => !(skill in skillNotes),
);
