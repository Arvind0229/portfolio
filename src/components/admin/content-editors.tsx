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
import { SCENE_IMAGES } from '@/data/scenes';
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

export interface ContentState<T> {
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
export function useContent<T>(key: string): ContentState<T> {
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
  exploring: string;
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

      <Field
        label="Currently exploring"
        hint="Learning, not shipped work. Shown with a label that says so; leave blank to hide."
      >
        <input
          value={data.exploring}
          data-testid="profile-exploring"
          onChange={(event) => patch({ exploring: event.target.value })}
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
        <div key={group.id || index} className="surface-card space-y-4 p-5" data-testid={`skill-group-${group.id}`}>
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
          <RowControls
            index={index}
            count={data.length}
            label={group.name}
            onMove={(from, to) => setData(moveItem(data, from, to))}
            onRemove={() => setData(data.filter((_, n) => n !== index))}
          />
        </div>
      ))}
      <button
        type="button"
        className={addButton}
        data-testid="skills-add-group"
        onClick={() =>
          // No id: the parser derives one from the name on save.
          setData([...data, { name: 'New group', description: '', skills: ['New skill'] } as unknown as SkillGroup])
        }
      >
        Add a group
      </button>

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

/* ======================= Site defaults ======================= */

interface SiteSettingsContent {
  defaultTheme: string;
  defaultMode: string;
  defaultFont: string;
  robots: boolean;
  maintenance: boolean;
}

const THEME_LABELS: Record<string, string> = {
  clay: 'Light Clay',
  engineering: 'Midnight',
  studio: 'Studio',
  enterprise: 'Crimson Clay',
};
const MODE_LABELS: Record<string, string> = {
  auto: 'Each theme’s own (recommended)',
  light: 'Light',
  dark: 'Dark',
};
const FONT_LABELS: Record<string, string> = {
  precision: 'Precision',
  technical: 'Technical',
  editorial: 'Editorial',
};

function Select({
  value,
  options,
  labels,
  onChange,
  testId,
}: {
  value: string;
  options: readonly string[];
  labels: Record<string, string>;
  onChange: (value: string) => void;
  testId: string;
}) {
  return (
    <select
      value={value}
      data-testid={testId}
      onChange={(event) => onChange(event.target.value)}
      className={inputClass}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {labels[option] ?? option}
        </option>
      ))}
    </select>
  );
}

export function SiteSettingsEditor() {
  const { data, status, readOnly, setData, save, reload } =
    useContent<SiteSettingsContent>('settings');
  if (!data) return <StatusLine status={status} onReload={reload} />;
  const patch = (changes: Partial<SiteSettingsContent>) => setData({ ...data, ...changes });

  return (
    <div className="surface-card space-y-5 p-5" data-testid="admin-settings">
      <p className="text-[0.85rem] leading-relaxed text-[var(--text-secondary)]">
        What a <strong>first-time</strong> visitor sees. Anyone who has already picked a theme,
        mode or font keeps their own choice. Takes effect on the next deployment.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Default theme">
          <Select
            value={data.defaultTheme}
            options={Object.keys(THEME_LABELS)}
            labels={THEME_LABELS}
            onChange={(value) => patch({ defaultTheme: value })}
            testId="settings-theme"
          />
        </Field>
        <Field label="Default mode">
          <Select
            value={data.defaultMode}
            options={Object.keys(MODE_LABELS)}
            labels={MODE_LABELS}
            onChange={(value) => patch({ defaultMode: value })}
            testId="settings-mode"
          />
        </Field>
        <Field label="Default font">
          <Select
            value={data.defaultFont}
            options={Object.keys(FONT_LABELS)}
            labels={FONT_LABELS}
            onChange={(value) => patch({ defaultFont: value })}
            testId="settings-font"
          />
        </Field>
      </div>
      <label className="flex items-center gap-2.5 text-[0.85rem] text-[var(--text-primary)]">
        <input
          type="checkbox"
          checked={data.robots !== false}
          data-testid="settings-robots"
          onChange={(event) => patch({ robots: event.target.checked })}
        />
        Robot buddies — the small robots that peek from the corners and play along the bottom
      </label>
      <label className="flex items-center gap-2.5 text-[0.85rem] text-[var(--text-primary)]">
        <input
          type="checkbox"
          checked={data.maintenance === true}
          data-testid="settings-maintenance"
          onChange={(event) => patch({ maintenance: event.target.checked })}
        />
        Maintenance mode — every public page shows “Upgrading the bots” (with a 503) until
        this is turned off. The admin panel keeps working.
      </label>
      <SaveBar
        status={status}
        readOnly={readOnly}
        onSave={() => void save()}
        onReload={() => void reload()}
        testId="settings-save"
      />
    </div>
  );
}

/* ========================== Scenes =========================== */

interface SceneTextContent {
  eyebrow: string;
  title: string;
  body: string;
  image: string;
}
interface ScenesContent {
  landing: { tagline: string; image: string };
  mission: SceneTextContent[];
  build: { eyebrow: string; title: string; stages: (SceneTextContent & { step: string; detail: string })[] };
  human: SceneTextContent & { alt: string };
  closing: SceneTextContent & { cta: string };
}

/**
 * Picks an image from the closed list of files that exist. A thumbnail shows
 * the current choice, so nobody has to remember what "build-3" looks like.
 */
function ImagePicker({
  value,
  onChange,
  testId,
}: {
  value: string;
  onChange: (value: string) => void;
  testId: string;
}) {
  const current = SCENE_IMAGES.find((image) => image.id === value);
  return (
    <div className="flex items-center gap-3">
      {current ? (
        // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail
        <img
          src={`/journey/${current.small ?? current.src}`}
          alt=""
          className="h-14 w-20 shrink-0 rounded-[var(--radius-sm)] border border-[var(--border)] object-cover"
        />
      ) : null}
      <select
        value={value}
        data-testid={testId}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      >
        {SCENE_IMAGES.map((image) => (
          <option key={image.id} value={image.id}>
            {image.label} ({image.width}×{image.height})
          </option>
        ))}
      </select>
    </div>
  );
}

function SceneFields({
  value,
  onChange,
  prefix,
  fields = ['eyebrow', 'title', 'body'],
}: {
  value: SceneTextContent;
  onChange: (next: SceneTextContent) => void;
  prefix: string;
  fields?: readonly ('eyebrow' | 'title' | 'body')[];
}) {
  return (
    <div className="space-y-3">
      {fields.includes('eyebrow') ? (
        <Field label="Small label above">
          <input
            value={value.eyebrow}
            data-testid={`${prefix}-eyebrow`}
            onChange={(event) => onChange({ ...value, eyebrow: event.target.value })}
            className={inputClass}
          />
        </Field>
      ) : null}
      {fields.includes('title') ? (
        <Field label="Heading">
          <input
            value={value.title}
            data-testid={`${prefix}-title`}
            onChange={(event) => onChange({ ...value, title: event.target.value })}
            className={inputClass}
          />
        </Field>
      ) : null}
      {fields.includes('body') ? (
        <Field label="Text">
          <TextArea
            rows={3}
            value={value.body}
            testId={`${prefix}-body`}
            onChange={(body) => onChange({ ...value, body })}
          />
        </Field>
      ) : null}
      <Field label="Image">
        <ImagePicker
          value={value.image}
          testId={`${prefix}-image`}
          onChange={(image) => onChange({ ...value, image })}
        />
      </Field>
    </div>
  );
}

export function ScenesEditor() {
  const { data, status, readOnly, setData, save, reload } = useContent<ScenesContent>('scenes');
  if (!data) return <StatusLine status={status} onReload={reload} />;

  const card = 'surface-card space-y-4 p-5';
  const h = 'font-display text-[1rem] text-[var(--text-primary)]';

  return (
    <div className="space-y-6" data-testid="admin-scenes">
      <p className="text-[0.85rem] leading-relaxed text-[var(--text-secondary)]">
        Every word and picture in the cinematic sections. Images come from the set already in the
        site, so a choice can never point at a missing file. Leaving a field empty restores the
        original text. Takes effect on the next deployment.
      </p>

      <section className={card}>
        <h3 className={h}>Landing</h3>
        <Field label="Tagline">
          <TextArea
            rows={2}
            value={data.landing.tagline}
            testId="scene-landing-tagline"
            onChange={(tagline) => setData({ ...data, landing: { ...data.landing, tagline } })}
          />
        </Field>
        <Field label="Background image">
          <ImagePicker
            value={data.landing.image}
            testId="scene-landing-image"
            onChange={(image) => setData({ ...data, landing: { ...data.landing, image } })}
          />
        </Field>
      </section>

      <section className={card}>
        <h3 className={h}>The mission — five chapters</h3>
        {data.mission.map((chapter, index) => (
          <div key={index} className="border-t border-[var(--border-subtle)] pt-4 first:border-0 first:pt-0">
            <SceneFields
              prefix={`scene-mission-${index}`}
              value={chapter}
              onChange={(next) =>
                setData({ ...data, mission: data.mission.map((c, n) => (n === index ? next : c)) })
              }
            />
          </div>
        ))}
      </section>

      <section className={card}>
        <h3 className={h}>The build — five stages</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Small label above">
            <input
              value={data.build.eyebrow}
              onChange={(event) => setData({ ...data, build: { ...data.build, eyebrow: event.target.value } })}
              className={inputClass}
            />
          </Field>
          <Field label="Heading">
            <input
              value={data.build.title}
              data-testid="scene-build-title"
              onChange={(event) => setData({ ...data, build: { ...data.build, title: event.target.value } })}
              className={inputClass}
            />
          </Field>
        </div>
        {data.build.stages.map((stage, index) => {
          const update = (changes: Partial<ScenesContent['build']['stages'][number]>) =>
            setData({
              ...data,
              build: {
                ...data.build,
                stages: data.build.stages.map((s, n) => (n === index ? { ...s, ...changes } : s)),
              },
            });
          return (
            <div key={index} className="space-y-3 border-t border-[var(--border-subtle)] pt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={`Stage ${index + 1} — rail label`}>
                  <input value={stage.step} onChange={(e) => update({ step: e.target.value })} className={inputClass} />
                </Field>
                <Field label="Tags line">
                  <input value={stage.detail} onChange={(e) => update({ detail: e.target.value })} className={inputClass} />
                </Field>
              </div>
              <SceneFields
                prefix={`scene-build-${index}`}
                fields={['title', 'body']}
                value={stage}
                onChange={(next) => update(next)}
              />
            </div>
          );
        })}
      </section>

      <section className={card}>
        <h3 className={h}>Human + automation</h3>
        <SceneFields
          prefix="scene-human"
          value={data.human}
          onChange={(next) => setData({ ...data, human: { ...data.human, ...next } })}
        />
        <Field label="Image description (for screen readers)">
          <input
            value={data.human.alt}
            onChange={(event) => setData({ ...data, human: { ...data.human, alt: event.target.value } })}
            className={inputClass}
          />
        </Field>
      </section>

      <section className={card}>
        <h3 className={h}>Closing</h3>
        <SceneFields
          prefix="scene-closing"
          value={data.closing}
          onChange={(next) => setData({ ...data, closing: { ...data.closing, ...next } })}
        />
        <Field label="Button text">
          <input
            value={data.closing.cta}
            onChange={(event) => setData({ ...data, closing: { ...data.closing, cta: event.target.value } })}
            className={inputClass}
          />
        </Field>
      </section>

      <SaveBar
        status={status}
        readOnly={readOnly}
        onSave={() => void save()}
        onReload={() => void reload()}
        testId="scenes-save"
      />
    </div>
  );
}

/* ======================= Shared list controls ======================= */

/** Move up / move down / remove for one entry in an editable list. */
function RowControls({
  index,
  count,
  onMove,
  onRemove,
  label,
}: {
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
  onRemove: () => void;
  label: string;
}) {
  const button =
    'rounded-[var(--radius-sm)] border border-[var(--border)] px-2 py-1 text-[0.75rem] text-[var(--text-secondary)] disabled:opacity-40';
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className={button} disabled={index === 0} onClick={() => onMove(index, index - 1)} aria-label={`Move ${label} up`}>
        ↑
      </button>
      <button type="button" className={button} disabled={index === count - 1} onClick={() => onMove(index, index + 1)} aria-label={`Move ${label} down`}>
        ↓
      </button>
      <button type="button" className={cn(button, 'text-[var(--error,#e1163c)]')} onClick={onRemove}>
        Remove
      </button>
    </div>
  );
}

function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (item !== undefined) next.splice(to, 0, item);
  return next;
}

const addButton =
  'rounded-[var(--radius-md)] border border-dashed border-[var(--border)] px-4 py-2 text-[0.85rem] text-[var(--text-secondary)] hover:border-[var(--accent-primary)]';

/* ============================ Impact ============================ */

interface ImpactMetricRow {
  id: string;
  value: number;
  prefix: string;
  suffix: string;
  label: string;
  detail: string;
  outOf?: number;
}
interface PillarRow {
  id: string;
  title: string;
  description: string;
  points: readonly string[];
}
interface FlowRow {
  id: string;
  name: string;
  verified: boolean;
  caption: string;
  steps: readonly { id: string; label: string; detail: string }[];
}
interface ImpactContentShape {
  metrics: readonly ImpactMetricRow[];
  narrative: string;
  achievements: readonly string[];
  pillars: readonly PillarRow[];
  flows: readonly FlowRow[];
}

/**
 * Everything on the Impact and Skills cards that used to be hard-coded:
 * the four figures, the narrative line, achievements, the expertise pillars and
 * the architecture flows. Add, edit, reorder and remove, all here.
 */
export function ImpactEditor() {
  const { data, status, readOnly, setData, save, reload } = useContent<ImpactContentShape>('impact');
  if (!data) return <StatusLine status={status} onReload={reload} />;
  const patch = (changes: Partial<ImpactContentShape>) => setData({ ...data, ...changes });
  const setMetric = (index: number, changes: Partial<ImpactMetricRow>) =>
    patch({ metrics: data.metrics.map((m, n) => (n === index ? { ...m, ...changes } : m)) });
  const setPillar = (index: number, changes: Partial<PillarRow>) =>
    patch({ pillars: data.pillars.map((p, n) => (n === index ? { ...p, ...changes } : p)) });
  const setFlow = (index: number, changes: Partial<FlowRow>) =>
    patch({ flows: data.flows.map((f, n) => (n === index ? { ...f, ...changes } : f)) });

  return (
    <div className="space-y-6" data-testid="admin-impact">
      <div className="surface-card space-y-4 p-5">
        <h3 className="font-display text-[1rem]">Figures</h3>
        <p className="text-[0.82rem] text-[var(--text-muted)]">
          Only numbers the resume supports. “Out of” draws a meter, so set it only for a real
          share (e.g. 100 for a percentage).
        </p>
        {data.metrics.map((metric, index) => (
          <div key={metric.id || index} className="space-y-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-4" data-testid={`impact-metric-${index}`}>
            <div className="grid gap-3 sm:grid-cols-[1fr_5rem_5rem_5rem_6rem]">
              <Field label="Label">
                <input className={inputClass} value={metric.label} data-testid={`impact-metric-label-${index}`} onChange={(e) => setMetric(index, { label: e.target.value })} />
              </Field>
              <Field label="Prefix">
                <input className={inputClass} value={metric.prefix} onChange={(e) => setMetric(index, { prefix: e.target.value })} />
              </Field>
              <Field label="Value">
                <input className={inputClass} type="number" min={0} value={metric.value} data-testid={`impact-metric-value-${index}`} onChange={(e) => setMetric(index, { value: Number(e.target.value) })} />
              </Field>
              <Field label="Suffix">
                <input className={inputClass} value={metric.suffix} onChange={(e) => setMetric(index, { suffix: e.target.value })} />
              </Field>
              <Field label="Out of">
                <input className={inputClass} type="number" min={0} value={metric.outOf ?? ''} onChange={(e) => setMetric(index, { outOf: e.target.value ? Number(e.target.value) : undefined })} />
              </Field>
            </div>
            <Field label="Detail">
              <input className={inputClass} value={metric.detail} onChange={(e) => setMetric(index, { detail: e.target.value })} />
            </Field>
            <RowControls
              index={index}
              count={data.metrics.length}
              label={metric.label}
              onMove={(from, to) => patch({ metrics: moveItem(data.metrics, from, to) })}
              onRemove={() => patch({ metrics: data.metrics.filter((_, n) => n !== index) })}
            />
          </div>
        ))}
        <button type="button" className={addButton} data-testid="impact-add-metric" onClick={() => patch({ metrics: [...data.metrics, { id: '', value: 0, prefix: '', suffix: '', label: 'New figure', detail: '' }] })}>
          Add a figure
        </button>
      </div>

      <div className="surface-card space-y-4 p-5">
        <Field label="Narrative line" hint="The sentence under the figures.">
          <TextArea value={data.narrative} onChange={(value) => patch({ narrative: value })} />
        </Field>
        <Field label="Achievements" hint="One per line.">
          <TextArea rows={Math.max(4, data.achievements.length + 1)} value={lines(data.achievements)} testId="impact-achievements" onChange={(value) => patch({ achievements: toLines(value) })} />
        </Field>
      </div>

      <div className="surface-card space-y-4 p-5">
        <h3 className="font-display text-[1rem]">Expertise pillars</h3>
        {data.pillars.map((pillar, index) => (
          <div key={pillar.id || index} className="space-y-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-4">
            <Field label="Title">
              <input className={inputClass} value={pillar.title} data-testid={`impact-pillar-title-${index}`} onChange={(e) => setPillar(index, { title: e.target.value })} />
            </Field>
            <Field label="Description">
              <TextArea value={pillar.description} onChange={(value) => setPillar(index, { description: value })} />
            </Field>
            <Field label="Points" hint="One per line.">
              <TextArea rows={Math.max(3, pillar.points.length + 1)} value={lines(pillar.points)} onChange={(value) => setPillar(index, { points: toLines(value) })} />
            </Field>
            <RowControls
              index={index}
              count={data.pillars.length}
              label={pillar.title}
              onMove={(from, to) => patch({ pillars: moveItem(data.pillars, from, to) })}
              onRemove={() => patch({ pillars: data.pillars.filter((_, n) => n !== index) })}
            />
          </div>
        ))}
        <button type="button" className={addButton} onClick={() => patch({ pillars: [...data.pillars, { id: '', title: 'New pillar', description: '', points: [] }] })}>
          Add a pillar
        </button>
      </div>

      <div className="surface-card space-y-4 p-5">
        <h3 className="font-display text-[1rem]">Architecture flows</h3>
        {data.flows.map((flow, index) => (
          <div key={flow.id || index} className="space-y-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <Field label="Name">
                <input className={inputClass} value={flow.name} onChange={(e) => setFlow(index, { name: e.target.value })} />
              </Field>
              <label className="flex items-end gap-2 pb-2 text-[0.82rem]">
                <input type="checkbox" checked={flow.verified} onChange={(e) => setFlow(index, { verified: e.target.checked })} />
                Built for real (unticked shows “Illustrative”)
              </label>
            </div>
            <Field label="Caption">
              <TextArea value={flow.caption} onChange={(value) => setFlow(index, { caption: value })} />
            </Field>
            <Field label="Steps" hint="One per line, as “Label — detail”.">
              <TextArea
                rows={Math.max(4, flow.steps.length + 1)}
                value={flow.steps.map((step) => (step.detail ? `${step.label} — ${step.detail}` : step.label)).join('\n')}
                onChange={(value) =>
                  setFlow(index, {
                    steps: toLines(value).map((line) => {
                      const [label = '', ...rest] = line.split(' — ');
                      return { id: '', label: label.trim(), detail: rest.join(' — ').trim() };
                    }),
                  })
                }
              />
            </Field>
            <RowControls
              index={index}
              count={data.flows.length}
              label={flow.name}
              onMove={(from, to) => patch({ flows: moveItem(data.flows, from, to) })}
              onRemove={() => patch({ flows: data.flows.filter((_, n) => n !== index) })}
            />
          </div>
        ))}
        <button type="button" className={addButton} onClick={() => patch({ flows: [...data.flows, { id: '', name: 'New flow', verified: false, caption: '', steps: [{ id: '', label: 'First step', detail: '' }] }] })}>
          Add a flow
        </button>
      </div>

      <SaveBar status={status} readOnly={readOnly} onSave={() => void save()} onReload={() => void reload()} testId="impact-save" />
    </div>
  );
}

/* ========================== Skill notes ========================== */

/**
 * What each tool is and why it is used — the text in the popup when a skill is
 * clicked. Every skill in the Skills tab is listed here; a skill with an empty
 * note shows “no note yet” in the popup rather than a half-written card.
 */
export function SkillNotesEditor() {
  const notes = useContent<Record<string, { what: string; why: string }>>('skill-notes');
  const groups = useContent<readonly SkillGroup[]>('skills');
  if (!notes.data) return <StatusLine status={notes.status} onReload={notes.reload} />;
  if (!groups.data) return <StatusLine status={groups.status} onReload={groups.reload} />;
  const data = notes.data;
  const skills = [...new Set(groups.data.flatMap((group) => group.skills))];
  const setNote = (skill: string, changes: Partial<{ what: string; why: string }>) =>
    notes.setData({ ...data, [skill]: { what: '', why: '', ...data[skill], ...changes } });

  return (
    <div className="space-y-4" data-testid="admin-skill-notes">
      {skills.map((skill) => (
        <div key={skill} className="surface-card space-y-3 p-5">
          <h3 className="font-display text-[0.98rem]">{skill}</h3>
          <Field label="What it is" hint="About the tool only — public, checkable facts.">
            <TextArea value={data[skill]?.what ?? ''} testId={`note-what-${skill}`} onChange={(value) => setNote(skill, { what: value })} />
          </Field>
          <Field label="Why it gets used">
            <TextArea value={data[skill]?.why ?? ''} onChange={(value) => setNote(skill, { why: value })} />
          </Field>
        </div>
      ))}
      <SaveBar status={notes.status} readOnly={notes.readOnly} onSave={() => void notes.save()} onReload={() => void notes.reload()} testId="skill-notes-save" />
    </div>
  );
}
