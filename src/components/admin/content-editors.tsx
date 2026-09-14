'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Field,
  PairList,
  TextArea,
  inputClass,
  lines,
  toLines,
} from '@/components/admin/admin-panel';
import { cn } from '@/lib/utils/cn';
import type { ResumeVersion, SkillGroup, SocialLink } from '@/types';

/**
 * The content editors: profile, skills, and resume versions.
 *
 * ## Why these are here and not in `admin-panel.tsx`
 *
 * The panel already works. Adding three sections to it would have meant editing
 * a 650-line file that is under test, to add code that shares nothing with what
 * is already there except its input components. These import those components
 * rather than copying them, and the panel gains a switcher — which is the
 * smallest change that adds the sections without touching what works.
 *
 * ## One loading/saving shape, used three times
 *
 * `useContent` is the seam the global UX states will plug into later. Every
 * editor here already goes through the same five states — loading, ready,
 * saving, saved, failed — and the same conflict handling, so when the shared
 * skeleton and error surfaces arrive there is one place to change rather than
 * three ad-hoc implementations to reconcile.
 */

type Status =
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'saving' }
  | { kind: 'saved'; pendingDeploy: boolean }
  | { kind: 'conflict'; message: string }
  | { kind: 'error'; message: string };

interface ContentState<T> {
  data: T | null;
  status: Status;
  /** True when this deployment can show content but not save it. */
  readOnly: boolean;
  setData: (next: T) => void;
  save: () => Promise<void>;
  reload: () => Promise<void>;
}

/**
 * Load, edit and conditionally save one content key.
 *
 * The version from the load is held in a ref and sent back on save, which is
 * what makes the write conditional. It is a ref rather than state on purpose:
 * it must not cause a render, and a save must read the value at the moment of
 * the click rather than whatever a render closed over.
 */
function useContent<T>(key: string): ContentState<T> {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const [readOnly, setReadOnly] = useState(false);
  const version = useRef<string | undefined>(undefined);

  const reload = useCallback(async () => {
    setStatus({ kind: 'loading' });
    try {
      const response = await fetch(`/api/admin/content/${key}`, { cache: 'no-store' });
      const body = (await response.json()) as {
        ok: boolean;
        data?: T;
        version?: string;
        error?: string;
        readOnly?: boolean;
      };
      if (!body.ok) {
        setStatus({ kind: 'error', message: body.error ?? 'Could not load this.' });
        return;
      }
      version.current = body.version;
      setReadOnly(Boolean(body.readOnly));
      setData(body.data ?? null);
      setStatus(
        body.readOnly
          ? { kind: 'error', message: body.error ?? 'Saving is not configured on this deployment.' }
          : { kind: 'ready' },
      );
    } catch {
      setStatus({ kind: 'error', message: 'Could not reach the server.' });
    }
  }, [key]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const save = useCallback(async () => {
    if (data === null) return;
    setStatus({ kind: 'saving' });
    try {
      const response = await fetch(`/api/admin/content/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, version: version.current }),
      });
      const body = (await response.json()) as {
        ok: boolean;
        error?: string;
        code?: 'conflict';
        version?: string;
        pendingDeploy?: boolean;
        data?: T;
      };

      if (body.code === 'conflict') {
        setStatus({ kind: 'conflict', message: body.error ?? 'Changed elsewhere.' });
        return;
      }
      if (!body.ok) {
        setStatus({ kind: 'error', message: body.error ?? 'Save failed.' });
        return;
      }

      // Carry the new version forward, or the next save from this same open
      // form would quote a superseded one and conflict with itself.
      if (body.version) version.current = body.version;
      // And show what the server actually stored, which is what the validator
      // kept — not what was typed. A dropped field should be visible.
      if (body.data) setData(body.data);
      setStatus({ kind: 'saved', pendingDeploy: Boolean(body.pendingDeploy) });
    } catch {
      setStatus({ kind: 'error', message: 'Could not reach the server.' });
    }
  }, [data, key]);

  return { data, status, readOnly, setData, save, reload };
}

/* ------------------------------------------------------------------ */
/* Shared chrome                                                       */
/* ------------------------------------------------------------------ */

function StatusLine({ status, onReload }: { status: Status; onReload: () => void }) {
  if (status.kind === 'ready') return null;

  const text =
    status.kind === 'loading'
      ? 'Loading…'
      : status.kind === 'saving'
        ? 'Saving…'
        : status.kind === 'saved'
          ? status.pendingDeploy
            ? 'Saved and committed. The live site updates when the deployment finishes — usually a minute or two.'
            : 'Saved to your project files. Refresh the site to see it.'
          : status.message;

  const bad = status.kind === 'conflict' || status.kind === 'error';

  return (
    <p
      role="status"
      data-testid="content-status"
      data-kind={status.kind}
      className={cn(
        'text-[0.82rem]',
        bad ? 'text-[var(--error,#e1163c)]' : 'text-[var(--text-secondary)]',
      )}
    >
      {text}
      {status.kind === 'conflict' ? (
        <>
          {' '}
          <button
            type="button"
            onClick={onReload}
            data-testid="content-reload"
            className="underline underline-offset-2"
          >
            Reload
          </button>
        </>
      ) : null}
    </p>
  );
}

function SaveBar({
  status,
  readOnly,
  onSave,
  onReload,
  testId,
}: {
  status: Status;
  readOnly: boolean;
  onSave: () => void;
  onReload: () => void;
  testId: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-[var(--border-subtle)] pt-5">
      <button
        type="button"
        onClick={onSave}
        disabled={readOnly || status.kind === 'saving' || status.kind === 'loading'}
        title={readOnly ? 'Saving is not configured on this deployment.' : undefined}
        data-testid={testId}
        className="rounded-[var(--radius-md)] bg-[var(--accent-primary)] px-4 py-2 text-[0.85rem] font-medium text-[var(--accent-contrast)] disabled:opacity-50"
      >
        {status.kind === 'saving' ? 'Saving…' : 'Save'}
      </button>
      <StatusLine status={status} onReload={onReload} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Profile                                                             */
/* ------------------------------------------------------------------ */

/** The editable half of a social link — the id is derived on save. */
interface SocialRow {
  [key: string]: string | undefined;
  label?: string;
  href?: string;
  handle?: string;
}

interface ProfileContent {
  name: string;
  shortName: string;
  title: string;
  positioning: string;
  positioningThirdPerson: string;
  summary: string;
  summaryThirdPerson: string;
  location: string;
  email: string;
  phone: string;
  availability: string;
  focusAreas: readonly string[];
  socials: readonly SocialLink[];
}

export function ProfileEditor() {
  const { data, status, readOnly, setData, save, reload } = useContent<ProfileContent>('profile');
  if (!data) return <StatusLine status={status} onReload={reload} />;

  const patch = (changes: Partial<ProfileContent>) => setData({ ...data, ...changes });

  return (
    <div className="space-y-6" data-testid="admin-profile">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name">
          <input
            value={data.name}
            data-testid="profile-name"
            onChange={(event) => patch({ name: event.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Short name" hint="Used where the full name would be too long.">
          <input
            value={data.shortName}
            data-testid="profile-shortName"
            onChange={(event) => patch({ shortName: event.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Title">
          <input
            value={data.title}
            data-testid="profile-title"
            onChange={(event) => patch({ title: event.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Location">
          <input
            value={data.location}
            data-testid="profile-location"
            onChange={(event) => patch({ location: event.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Email">
          <input
            value={data.email}
            data-testid="profile-email"
            onChange={(event) => patch({ email: event.target.value })}
            className={inputClass}
          />
        </Field>
        <Field
          label="Phone"
          hint="Changing this hides the WhatsApp QR code until `npm run qr` is run — the committed code would otherwise still point at the old number."
        >
          <input
            value={data.phone}
            data-testid="profile-phone"
            onChange={(event) => patch({ phone: event.target.value })}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Availability">
        <input
          value={data.availability}
          data-testid="profile-availability"
          onChange={(event) => patch({ availability: event.target.value })}
          className={inputClass}
        />
      </Field>

      {/*
        Two voices, same facts. The page speaks as Arvind; the assistant speaks
        about him. A data-integrity test asserts both carry the same anchor
        facts and that the third-person one has no first-person pronouns — so
        editing one without the other will fail the build rather than produce
        an assistant that says "I started as an IT Executive".
      */}
      <Field label="Positioning — first person" hint="One line, in your voice. Shown on the page.">
        <TextArea
          value={data.positioning}
          testId="profile-positioning"
          onChange={(value) => patch({ positioning: value })}
        />
      </Field>
      <Field
        label="Positioning — third person"
        hint="The same line, about you. This is what the assistant quotes."
      >
        <TextArea
          value={data.positioningThirdPerson}
          testId="profile-positioningThirdPerson"
          onChange={(value) => patch({ positioningThirdPerson: value })}
        />
      </Field>
      <Field label="Summary — first person">
        <TextArea
          rows={6}
          value={data.summary}
          testId="profile-summary"
          onChange={(value) => patch({ summary: value })}
        />
      </Field>
      <Field label="Summary — third person" hint="What the assistant quotes.">
        <TextArea
          rows={6}
          value={data.summaryThirdPerson}
          testId="profile-summaryThirdPerson"
          onChange={(value) => patch({ summaryThirdPerson: value })}
        />
      </Field>

      <Field label="Focus areas" hint="One per line.">
        <TextArea
          rows={6}
          value={lines(data.focusAreas)}
          testId="profile-focusAreas"
          onChange={(value) => patch({ focusAreas: toLines(value) })}
        />
      </Field>

      <Field
        label="Social and contact links"
        hint="Only https: and mailto: links are accepted — anything else is dropped on save."
      >
        {/*
          Edited without the `id`, deliberately.

          The id is derived from the label on save — it exists to be a React key
          and a test handle, not content. Showing it would be asking a person to
          invent a slug, which is asking them to get it wrong, and it is one
          more field a save can break for no benefit.
        */}
        <PairList<SocialRow>
          items={data.socials.map(({ label, href, handle }) => ({ label, href, handle }))}
          testId="profile-socials"
          addLabel="Add a link"
          fields={[
            { key: 'label', label: 'Label' },
            { key: 'href', label: 'URL (https: or mailto:)' },
            { key: 'handle', label: 'Shown as' },
          ]}
          onChange={(next) =>
            patch({
              socials: next.map((row) => ({
                id: '',
                label: row.label ?? '',
                href: row.href ?? '',
                handle: row.handle ?? '',
              })),
            })
          }
        />
      </Field>

      <SaveBar
        status={status}
        readOnly={readOnly}
        onSave={() => void save()}
        onReload={() => void reload()}
        testId="profile-save"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Skills                                                              */
/* ------------------------------------------------------------------ */

export function SkillsEditor() {
  const { data, status, readOnly, setData, save, reload } =
    useContent<readonly SkillGroup[]>('skills');
  if (!data) return <StatusLine status={status} onReload={reload} />;

  const patchGroup = (index: number, changes: Partial<SkillGroup>) =>
    setData(data.map((group, n) => (n === index ? { ...group, ...changes } : group)));

  return (
    <div className="space-y-6" data-testid="admin-skills">
      {data.map((group, index) => (
        <div key={group.id} className="surface-card space-y-4 p-5" data-testid={`skill-group-${group.id}`}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Group name">
              <input
                value={group.name}
                data-testid={`skill-name-${group.id}`}
                onChange={(event) => patchGroup(index, { name: event.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Description">
              <input
                value={group.description}
                data-testid={`skill-desc-${group.id}`}
                onChange={(event) => patchGroup(index, { description: event.target.value })}
                className={inputClass}
              />
            </Field>
          </div>
          <Field
            label="Skills"
            hint="One per line. A group with no skills is dropped on save — an empty card reads as a loading state that never finished."
          >
            <TextArea
              rows={Math.max(4, group.skills.length + 1)}
              value={lines(group.skills)}
              testId={`skill-list-${group.id}`}
              onChange={(value) => patchGroup(index, { skills: toLines(value) })}
            />
          </Field>
        </div>
      ))}

      <SaveBar
        status={status}
        readOnly={readOnly}
        onSave={() => void save()}
        onReload={() => void reload()}
        testId="skills-save"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Resume versions                                                     */
/* ------------------------------------------------------------------ */

/**
 * Which resume the site serves, and the ones before it.
 *
 * Rollback is repointing `active` — the older file is still there, byte for
 * byte, because nothing is overwritten on upload. That is why this is a list of
 * buttons rather than a restore procedure.
 */
export function ResumeVersions({
  active,
  versions,
  onActivate,
  busy,
}: {
  active: string | null;
  versions: readonly ResumeVersion[];
  onActivate: (id: string) => void;
  busy: boolean;
}) {
  if (versions.length === 0) {
    return (
      <p className="text-[0.85rem] text-[var(--text-muted)]" data-testid="resume-versions-empty">
        No resume has been uploaded yet. The site shows an unavailable state until one is.
      </p>
    );
  }

  return (
    <ul className="space-y-2" data-testid="resume-versions">
      {[...versions].reverse().map((version) => {
        const current = version.id === active;
        return (
          <li
            key={version.id}
            data-testid={`resume-version-${version.id}`}
            data-active={current ? 'true' : 'false'}
            className={cn(
              'flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] border p-3',
              current
                ? 'border-[var(--accent-primary)] bg-[color-mix(in_srgb,var(--accent-primary)_8%,transparent)]'
                : 'border-[var(--border-subtle)]',
            )}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.85rem] text-[var(--text-primary)]">
                {version.label}
                {current ? (
                  <span className="ml-2 font-mono text-[0.62rem] uppercase tracking-wider text-[var(--accent-primary)]">
                    Live
                  </span>
                ) : null}
              </p>
              <p className="mt-0.5 font-mono text-[0.66rem] text-[var(--text-muted)]">
                {version.uploadedAt ? new Date(version.uploadedAt).toLocaleString() : 'date unknown'}
                {version.bytes ? ` · ${Math.round(version.bytes / 1024)} KB` : ''}
                {version.docx ? ' · PDF + DOCX' : ' · PDF'}
              </p>
            </div>

            <a
              href={version.pdf}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[0.78rem] text-[var(--accent-primary)] underline underline-offset-2"
            >
              View
            </a>

            {current ? null : (
              <button
                type="button"
                onClick={() => onActivate(version.id)}
                disabled={busy}
                data-testid={`resume-activate-${version.id}`}
                className="rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-1.5 text-[0.78rem] text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] disabled:opacity-50"
              >
                Make this the live one
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
