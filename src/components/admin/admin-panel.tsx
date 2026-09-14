'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import type { ProjectDepth } from '@/types';

/**
 * The editor.
 *
 * ## What this screen is for
 *
 * The resume gives every project a problem, a solution and a few outcomes.
 * That is enough for a card and nowhere near enough for the question the
 * assistant is actually asked — "tell me about this project" followed by five
 * increasingly specific follow-ups. This form is where the answers to those
 * follow-ups go, in Arvind's words, so the assistant quotes him rather than
 * generalising.
 *
 * ## Why the field labels are questions
 *
 * A field called "Scale" gets left blank; "How many records does it touch, and
 * how often does it run?" gets answered. The labels are written as the
 * questions an interviewer would ask, because the form is competing with the
 * effort of remembering, not with the effort of typing.
 *
 * ## Empty is a valid, meaningful state
 *
 * Nothing here is required. A blank field is not a gap to be filled with
 * something plausible — it is an instruction to the assistant to say "that is
 * not in the profile" if anyone asks. The help text says so, because the
 * temptation to round up on your own portfolio is real and the cost lands in
 * an interview.
 */

interface ProjectSummary {
  id: string;
  title: string;
  category: string;
}

type DepthMap = Record<string, ProjectDepth>;

interface Props {
  projects: readonly ProjectSummary[];
  /** True on a local dev server, where there is nothing to sign in to. */
  localMode: boolean;
}

/* ------------------------------------------------------------------ */
/* Small field primitives                                              */
/* ------------------------------------------------------------------ */

const inputClass =
  'w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[0.9rem] text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-primary)]';

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[0.85rem] font-medium text-[var(--text-primary)]">{label}</span>
      {hint ? (
        <span className="mt-0.5 block text-[0.75rem] leading-relaxed text-[var(--text-muted)]">
          {hint}
        </span>
      ) : null}
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

function TextArea({
  value,
  onChange,
  rows = 3,
  placeholder,
  testId,
}: {
  value: string;
  onChange: (next: string) => void;
  rows?: number;
  placeholder?: string;
  testId?: string;
}) {
  return (
    <textarea
      rows={rows}
      value={value}
      data-testid={testId}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={cn(inputClass, 'resize-y leading-relaxed')}
    />
  );
}

/** A list of short lines, edited as one textarea. */
function lines(value: readonly string[] | undefined): string {
  return (value ?? []).join('\n');
}
function toLines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

/* ------------------------------------------------------------------ */
/* Repeating pair editor                                               */
/* ------------------------------------------------------------------ */

/**
 * Generic over the row type rather than typed as a loose record.
 *
 * The loose version compiled and was wrong in a way worth avoiding: every
 * caller had to cast its typed array in and cast the result back out, so the
 * three places where a person's typing enters the model were the three places
 * the compiler had been told to look away. Generic, the challenge editor is
 * checked as a `ProjectChallenge[]` editor and a mismatched field name is a
 * build error instead of a field that silently never saves.
 */
function PairList<T extends Record<string, string | undefined>>({
  items,
  fields,
  addLabel,
  onChange,
  testId,
}: {
  items: readonly T[];
  fields: readonly { key: keyof T & string; label: string }[];
  addLabel: string;
  onChange: (next: T[]) => void;
  testId: string;
}) {
  const update = (index: number, key: keyof T & string, value: string) => {
    onChange(items.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  };

  return (
    <div className="space-y-3" data-testid={testId}>
      {items.map((item, index) => (
        <div
          // Index as key is correct here and unusual enough to note: these rows
          // have no stable identity of their own, and the list is only ever
          // appended to or spliced by the buttons below — never reordered — so
          // an index is a faithful identity rather than a shortcut.
          key={index}
          className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-3"
        >
          <div className="space-y-2.5">
            {fields.map((field) => (
              <Field key={field.key} label={field.label}>
                <TextArea
                  rows={2}
                  value={item[field.key] ?? ''}
                  onChange={(value) => update(index, field.key, value)}
                />
              </Field>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onChange(items.filter((_, i) => i !== index))}
            className="mt-2 text-[0.78rem] text-[var(--text-muted)] underline-offset-4 hover:text-[var(--accent-primary)] hover:underline"
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        /* The one cast in this component, and a contained one: a new row starts
           genuinely empty, which no complete `T` ever is. It is filled in by the
           person before it means anything, dropped on save if they leave it
           blank, and validated on the server either way. */
        onClick={() => onChange([...items, {} as T])}
        className="rounded-[var(--radius-sm)] border border-[var(--border)] px-3 py-1.5 text-[0.8rem] text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
      >
        {addLabel}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

export function AdminPanel({ projects, localMode }: Props) {
  /*
   * `null` means "not asked yet", and the distinction matters.
   *
   * The first version initialised this to `false` on the live site and only
   * flipped it when a sign-in succeeded, so the answer to "am I signed in?"
   * lived in React state and nowhere else. Refreshing the page threw that state
   * away and put the code box back up — with a perfectly valid two-hour cookie
   * sitting in the browser the whole time. An end-to-end test caught it on the
   * reload, which is the one thing a test can check that a click-through never
   * does.
   *
   * The cookie is the session, so the server is the only thing that can answer
   * the question. `probe` asks it, and because the endpoint that answers is
   * also the one that returns the saved data, the check and the load are a
   * single request rather than two.
   */
  const [authed, setAuthed] = useState<boolean | null>(localMode ? true : null);
  const [code, setCode] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const [depth, setDepth] = useState<DepthMap>({});
  const [activeId, setActiveId] = useState(projects[0]?.id ?? '');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // What the last load saw, sent back on save so the server can refuse a write
  // that would overwrite someone else's — see the conflict handling in
  // src/app/api/admin/depth/route.ts.
  const versionRef = useRef<string | undefined>(undefined);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/depth', { cache: 'no-store' });
      if (response.status === 401) {
        setAuthed(false);
        return;
      }
      setAuthed(true);
      const body = (await response.json()) as {
        ok: boolean;
        projects?: DepthMap;
        error?: string;
        version?: string;
      };
      /*
       * The version travels with the data and comes back on save. Holding it in
       * a ref rather than state on purpose: it must not trigger a re-render, and
       * a save reads the value at the moment of the click rather than whatever
       * a render happened to close over.
       */
      versionRef.current = body.version;
      if (body.ok && body.projects) setDepth(body.projects);
      else if (!body.ok) setStatus(body.error ?? 'Could not load the saved details.');
    } catch {
      // A network failure is not a signed-out state. Assuming it is would drop
      // whatever is typed into the form and demand a code over a dropped Wi-Fi
      // connection.
      setStatus('Could not reach the server.');
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (authed !== false) void load();
  }, [authed, load]);

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setAuthError(null);
    setBusy(true);
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const body = (await response.json()) as { ok: boolean; error?: string };
      if (body.ok) {
        setAuthed(true);
        setCode('');
      } else {
        setAuthError(body.error ?? 'Sign-in failed.');
      }
    } catch {
      setAuthError('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await fetch('/api/admin/login', { method: 'DELETE' });
    setAuthed(false);
    setDepth({});
    setLoaded(false);
  }

  const current = depth[activeId] ?? {};

  function patch(changes: Partial<ProjectDepth>) {
    setDepth((previous) => ({
      ...previous,
      [activeId]: { ...(previous[activeId] ?? {}), ...changes },
    }));
    setStatus(null);
  }

  async function save() {
    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch('/api/admin/depth', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projects: depth, version: versionRef.current }),
      });
      const body = (await response.json()) as {
        ok: boolean;
        error?: string;
        code?: 'conflict';
        version?: string;
        pendingDeploy?: boolean;
      };
      // Carry the new version forward, or the next save from this same open
      // form would quote a superseded one and be refused as a conflict with
      // its own previous save.
      if (body.ok && body.version) versionRef.current = body.version;

      setStatus(
        body.ok
          ? body.pendingDeploy
            ? 'Saved and committed. The live site updates when the deployment finishes — usually a minute or two.'
            : 'Saved to your project files. Refresh the site to see it.'
          : (body.error ?? 'Save failed.'),
      );
    } catch {
      setStatus('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  }

  async function uploadResume(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setStatus(null);
    try {
      const form = new FormData();
      form.append('resume', file);
      const response = await fetch('/api/admin/resume', { method: 'POST', body: form });
      const body = (await response.json()) as {
        ok: boolean;
        error?: string;
        code?: 'conflict';
        version?: string;
        pendingDeploy?: boolean;
      };
      setStatus(
        body.ok
          ? body.pendingDeploy
            ? 'Resume committed. It goes live when the deployment finishes.'
            : 'Resume replaced in your project files.'
          : (body.error ?? 'Upload failed.'),
      );
    } catch {
      setStatus('Could not reach the server.');
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  }

  /* ---- Sign-in ---------------------------------------------------- */

  if (authed === null) {
    // The gap between "page loaded" and "server answered". Showing the code box
    // here would ask for a code that a valid cookie makes unnecessary, and the
    // person would have typed half of it before it vanished.
    return (
      <p role="status" className="text-[0.85rem] text-[var(--text-muted)]">
        Checking your session…
      </p>
    );
  }

  if (!authed) {
    return (
      <form onSubmit={signIn} className="surface-card mx-auto max-w-sm p-6">
        <h2 className="font-display text-[1.1rem] text-[var(--text-primary)]">Sign in</h2>
        <p className="mt-2 text-[0.82rem] leading-relaxed text-[var(--text-secondary)]">
          Open your authenticator app and enter the six-digit code for this site.
        </p>
        <label className="mt-4 block">
          <span className="sr-only">Six-digit code</span>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            maxLength={7}
            data-testid="admin-code"
            className={cn(inputClass, 'text-center font-mono text-[1.3rem] tracking-[0.4em]')}
          />
        </label>
        {authError ? (
          <p role="alert" className="mt-3 text-[0.8rem] text-[var(--error, #dc2626)]">
            {authError}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy || code.trim().length < 6}
          data-testid="admin-signin"
          className="mt-4 w-full rounded-[var(--radius-md)] bg-[var(--accent-primary)] px-4 py-2.5 text-[0.9rem] font-medium text-white disabled:opacity-50"
        >
          {busy ? 'Checking…' : 'Sign in'}
        </button>
      </form>
    );
  }

  /* ---- Editor ----------------------------------------------------- */

  return (
    <div className="space-y-8" data-testid="admin-panel">
      <section className="surface-card p-5">
        <h2 className="font-display text-[1.05rem] text-[var(--text-primary)]">Resume</h2>
        <p className="mt-1.5 text-[0.82rem] leading-relaxed text-[var(--text-secondary)]">
          Replaces the file people download from the site. PDF only, up to 8 MB.
        </p>
        <input
          type="file"
          accept="application/pdf"
          onChange={uploadResume}
          disabled={busy}
          data-testid="admin-resume-input"
          className="mt-3 block w-full text-[0.85rem] text-[var(--text-secondary)] file:mr-3 file:rounded-[var(--radius-sm)] file:border file:border-[var(--border)] file:bg-transparent file:px-3 file:py-1.5 file:text-[var(--text-primary)]"
        />
      </section>

      <section>
        <h2 className="font-display text-[1.05rem] text-[var(--text-primary)]">Project details</h2>
        <p className="mt-1.5 max-w-2xl text-[0.82rem] leading-relaxed text-[var(--text-secondary)]">
          Whatever you write here is what the assistant can say. Leave a field blank and it will
          answer &ldquo;that is not in the profile&rdquo; rather than guess — which is the answer you
          want it to give, because the alternative is it inventing something you then have to defend
          in an interview.
        </p>

        <div
          role="tablist"
          aria-label="Projects"
          className="mt-4 flex flex-wrap gap-2 border-b border-[var(--border-subtle)] pb-3"
        >
          {projects.map((project) => {
            const filled = Boolean(depth[project.id]);
            return (
              <button
                key={project.id}
                role="tab"
                type="button"
                aria-selected={activeId === project.id}
                onClick={() => setActiveId(project.id)}
                data-testid={`admin-tab-${project.id}`}
                className={cn(
                  'rounded-[var(--radius-sm)] border px-3 py-1.5 text-[0.8rem] transition-colors',
                  activeId === project.id
                    ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                    : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border)]',
                )}
              >
                {project.title}
                {/* A dot, not a tick: it marks "something is here", which is all
                    that can honestly be claimed. Nothing measures completeness,
                    so nothing pretends to. */}
                {filled ? (
                  <span aria-hidden="true" className="ml-1.5 text-[var(--accent-tertiary)]">
                    •
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {!loaded ? (
          <p className="mt-6 text-[0.85rem] text-[var(--text-muted)]">Loading…</p>
        ) : (
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <Field
              label="How big is it, and how often does it run?"
              hint="One point per line. Records or transactions handled, run frequency, how many people or branches it reaches."
            >
              <TextArea
                testId="admin-scale"
                rows={4}
                value={lines(current.scale)}
                placeholder={'Runs every hour on weekdays\nAbout 4,000 records a day'}
                onChange={(value) => patch({ scale: toLines(value) })}
              />
            </Field>

            <Field
              label="Which systems and databases does it work against?"
              hint="One per line. Applications, databases, portals, APIs."
            >
              <TextArea
                testId="admin-systems"
                rows={4}
                value={lines(current.systems)}
                onChange={(value) => patch({ systems: toLines(value) })}
              />
            </Field>

            <Field label="How long did it take, start to production?">
              <TextArea
                rows={2}
                testId="admin-timeline"
                value={current.timeline ?? ''}
                onChange={(value) => patch({ timeline: value })}
              />
            </Field>

            <Field label="Who else was involved, and what exactly was your part?">
              <TextArea
                rows={2}
                testId="admin-team"
                value={current.team ?? ''}
                onChange={(value) => patch({ team: value })}
              />
            </Field>

            <Field label="How was this done before the bot existed?">
              <TextArea
                rows={3}
                value={current.before ?? ''}
                onChange={(value) => patch({ before: value })}
              />
            </Field>

            <Field
              label="What measurably changed after?"
              hint="Only figures you can stand behind. An estimate is fine if you say it is one."
            >
              <TextArea
                rows={3}
                value={current.after ?? ''}
                onChange={(value) => patch({ after: value })}
              />
            </Field>

            <Field
              label="When it fails at night, how do you find out?"
              hint="Monitoring, alerts, who looks, what happens next."
            >
              <TextArea
                rows={3}
                value={current.failureHandling ?? ''}
                onChange={(value) => patch({ failureHandling: value })}
              />
            </Field>

            <div className="lg:col-span-2">
              <p className="text-[0.85rem] font-medium text-[var(--text-primary)]">
                What was hard, and how did you solve it?
              </p>
              <p className="mt-0.5 mb-2 text-[0.75rem] text-[var(--text-muted)]">
                This is the section interviewers push on hardest. Both halves or neither — a
                difficulty with no resolution reads badly on your own site.
              </p>
              <PairList
                testId="admin-challenges"
                items={current.challenges ?? []}
                fields={[
                  { key: 'challenge', label: 'What was difficult' },
                  { key: 'resolution', label: 'How you resolved it' },
                ]}
                addLabel="Add a challenge"
                onChange={(challenges) => patch({ challenges })}
              />
            </div>

            <div className="lg:col-span-2">
              <p className="text-[0.85rem] font-medium text-[var(--text-primary)]">
                Decisions you made, and why
              </p>
              <p className="mt-0.5 mb-2 text-[0.75rem] text-[var(--text-muted)]">
                The reasoning is the signal, not the choice. &ldquo;Front-end automation because the
                vendor exposed no API&rdquo; says more than the tool name ever will.
              </p>
              <PairList
                testId="admin-decisions"
                items={current.decisions ?? []}
                fields={[
                  { key: 'decision', label: 'What you decided' },
                  { key: 'why', label: 'Why' },
                  { key: 'alternatives', label: 'What else you considered (optional)' },
                ]}
                addLabel="Add a decision"
                onChange={(decisions) => patch({ decisions })}
              />
            </div>

            <div className="lg:col-span-2">
              <p className="text-[0.85rem] font-medium text-[var(--text-primary)]">
                Anything else people ask you about this
              </p>
              <p className="mt-0.5 mb-2 text-[0.75rem] text-[var(--text-muted)]">
                Write the question the way it gets asked. The assistant matches on those words.
              </p>
              <PairList
                testId="admin-faq"
                items={current.faq ?? []}
                fields={[
                  { key: 'question', label: 'Question' },
                  { key: 'answer', label: 'Your answer' },
                ]}
                addLabel="Add a question"
                onChange={(faq) => patch({ faq })}
              />
            </div>
          </div>
        )}
      </section>

      <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)] py-4">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          data-testid="admin-save"
          className="rounded-[var(--radius-md)] bg-[var(--accent-primary)] px-5 py-2.5 text-[0.9rem] font-medium text-white disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save all projects'}
        </button>
        {status ? (
          <p role="status" data-testid="admin-status" className="text-[0.82rem] text-[var(--text-secondary)]">
            {status}
          </p>
        ) : null}
        {!localMode ? (
          <button
            type="button"
            onClick={signOut}
            data-testid="admin-signout"
            className="ml-auto text-[0.8rem] text-[var(--text-muted)] underline-offset-4 hover:text-[var(--text-primary)] hover:underline"
          >
            Sign out
          </button>
        ) : null}
      </div>
    </div>
  );
}
