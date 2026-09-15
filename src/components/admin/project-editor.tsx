'use client';

import { useState } from 'react';
import { Field, TextArea, inputClass, lines, toLines } from '@/components/admin/admin-panel';
import { useContent } from '@/components/admin/content-editors';
import type { CompanyRow, ExperienceRow } from '@/components/admin/career-editors';
import { cn } from '@/lib/utils/cn';

/**
 * Project management.
 *
 * ## Why a list and a detail panel rather than one long form
 *
 * Five projects × a dozen fields each is four hundred lines of form. Nobody
 * finds anything in that, and the directive says so. So: a list on the left
 * that carries every list-level action (order, publish, feature, duplicate,
 * delete), and one project's fields on the right, grouped into sections.
 *
 * ## The id is the URL, and the form enforces that
 *
 * A new project's id is derived from its title as you type, shown, and frozen
 * the moment the project is created. An existing project's id is rendered as
 * text and cannot be edited, because editing it would silently break a live URL
 * — ADR-004 §2.
 *
 * ## Relationships are pickers, never text boxes
 *
 * `companyId` is a `<select>` of companies that exist; roles and skills are
 * checkboxes of records that exist. A reference cannot be mistyped, and one
 * that has since been removed is shown as missing rather than silently
 * dropping out of the form.
 *
 * ## Everything conflict-related is inherited
 *
 * Built on `useContent`, so optimistic concurrency, the stale-copy message and
 * the reload action come from the same place as profile and skills. There is no
 * second save path.
 */

export interface ProjectRow {
  id: string;
  title: string;
  category: string;
  businessView: string;
  technicalView: string;
  problem: string;
  solution: string;
  role: string;
  process: readonly string[];
  impact: readonly string[];
  technologies: readonly string[];
  companyId: string;
  experienceIds: readonly string[];
  skillIds: readonly string[];
  year: string;
  status: string;
  links: { live?: string; github?: string; caseStudy?: string };
  featured: boolean;
  visible: boolean;
  order: number;
}

const CATEGORIES = [
  'Operations Automation',
  'Reporting & BI',
  'Compliance',
  'IT & Access Management',
];

const STATUSES = ['', 'completed', 'ongoing', 'maintained'];

/** Must match `deriveProjectId` in `src/data/projects.ts` exactly. */
function deriveId(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
    .replace(/-+$/, '');
}

function uniqueId(title: string, taken: readonly string[]): string {
  const base = deriveId(title) || 'project';
  if (!taken.includes(base)) return base;
  for (let n = 2; n < 1000; n += 1) {
    const candidate = `${base}-${n}`.slice(0, 64);
    if (!taken.includes(candidate)) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`.slice(0, 64);
}

export function ProjectEditor() {
  const { data, setData, save, status, reload, readOnly } = useContent<ProjectRow[]>('projects');
  const { data: companies } = useContent<CompanyRow[]>('companies');
  const { data: roles } = useContent<ExperienceRow[]>('experience');
  const { data: skills } = useContent<{ id: string; name: string }[]>('skills');

  const [selected, setSelected] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  if (!data) {
    return (
      <section className="surface-card p-5" data-testid="project-editor">
        <h2 className="font-display text-[1.05rem] text-[var(--text-primary)]">Projects</h2>
        <p className="mt-3 text-[0.85rem] text-[var(--text-muted)]">
          {status.kind === 'error' ? status.message : 'Loading…'}
        </p>
      </section>
    );
  }

  // Bound once after the guard above. The closures below are declared in this
  // scope, and narrowing a hook's nullable return across them is not something
  // to rely on — one local makes it explicit instead.
  const rows: ProjectRow[] = data;

  const sorted = [...rows].sort((a, b) => a.order - b.order);
  const current = rows.find((project) => project.id === selected) ?? null;
  const takenIds = rows.map((project) => project.id);

  const update = (id: string, patch: Partial<ProjectRow>) =>
    setData(rows.map((project) => (project.id === id ? { ...project, ...patch } : project)));

  /** Rewrite `order` so it is always 1..n with no gaps after any list change. */
  const renumber = (list: ProjectRow[]) =>
    list.map((project, index) => ({ ...project, order: index + 1 }));

  function move(id: string, direction: -1 | 1) {
    const list = [...sorted];
    const from = list.findIndex((project) => project.id === id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= list.length) return;
    const [moved] = list.splice(from, 1);
    if (moved) list.splice(to, 0, moved);
    setData(renumber(list));
  }

  function create() {
    const title = newTitle.trim();
    if (!title) return;
    const id = uniqueId(title, takenIds);
    setData(
      renumber([
        ...sorted,
        {
          id,
          title,
          category: CATEGORIES[0] as string,
          businessView: '',
          technicalView: '',
          problem: '',
          solution: '',
          role: '',
          process: [],
          impact: [],
          technologies: [],
          companyId: companies?.[0]?.id ?? '',
          experienceIds: [],
          skillIds: [],
          year: '',
          status: '',
          links: {},
          featured: false,
          // New projects start hidden. Publishing is a deliberate act, and a
          // half-written project appearing on the live site the moment it is
          // created is the wrong default for a portfolio.
          visible: false,
          order: sorted.length + 1,
        },
      ]),
    );
    setNewTitle('');
    setSelected(id);
  }

  function duplicate(id: string) {
    const source = rows.find((project) => project.id === id);
    if (!source) return;
    const copyTitle = `${source.title} (copy)`;
    const copyId = uniqueId(copyTitle, takenIds);
    const index = sorted.findIndex((project) => project.id === id);
    const list = [...sorted];
    // A duplicate is always hidden and never featured: it is a starting point,
    // not a second live project.
    list.splice(index + 1, 0, {
      ...source,
      id: copyId,
      title: copyTitle,
      visible: false,
      featured: false,
    });
    setData(renumber(list));
    setSelected(copyId);
  }

  function remove(id: string) {
    setData(renumber(sorted.filter((project) => project.id !== id)));
    setConfirmDelete(null);
    if (selected === id) setSelected(null);
  }

  return (
    <section className="surface-card p-5" data-testid="project-editor">
      <h2 className="font-display text-[1.05rem] text-[var(--text-primary)]">Projects</h2>
      <p className="mt-1.5 max-w-2xl text-[0.82rem] leading-relaxed text-[var(--text-secondary)]">
        The web address of a project comes from its title and never changes afterwards, so
        a link you have shared keeps working. New projects start hidden — publish one when
        it is ready.
      </p>

      {/*
        `min-w-0` on both columns is load-bearing, not tidying.

        A grid item defaults to `min-width: auto`, which means it refuses to
        shrink below its content's min-content width. The address under each
        title — `/projects/compliance-tracking` — is one unbreakable token in a
        mono face, so at 320px it set a min-content wider than the screen and
        pushed the whole panel 37px off it. Measured, not guessed.

        `min-w-0` lets the column shrink; `truncate` on the address then does
        what it was always there to do. Neither clips anything a person needs:
        the full address is in the detail panel beside it.
      */}
      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        {/* ---- List ---- */}
        <div className="min-w-0">
          <ul className="space-y-2" data-testid="project-list">
            {sorted.map((project, index) => (
              <li
                key={project.id}
                data-testid={`project-row-${project.id}`}
                data-visible={project.visible ? 'true' : 'false'}
                className={cn(
                  'rounded-[var(--radius-md)] border p-3',
                  project.id === selected
                    ? 'border-[var(--accent-primary)] bg-[color-mix(in_srgb,var(--accent-primary)_8%,transparent)]'
                    : 'border-[var(--border-subtle)]',
                )}
              >
                <button
                  type="button"
                  onClick={() => setSelected(project.id)}
                  data-testid={`project-select-${project.id}`}
                  className="block w-full text-left"
                >
                  <span className="block truncate text-[0.88rem] text-[var(--text-primary)]">
                    {project.title || 'Untitled'}
                  </span>
                  <span className="mt-0.5 block truncate font-mono text-[0.62rem] text-[var(--text-muted)]">
                    /projects/{project.id}
                  </span>
                </button>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.7rem]">
                  <Tag on={project.visible} onLabel="Live" offLabel="Hidden" />
                  {project.featured ? <Tag on onLabel="Featured" offLabel="" /> : null}
                  <span className="ml-auto flex items-center gap-1">
                    <IconButton
                      label={`Move ${project.title} up`}
                      testId={`project-up-${project.id}`}
                      disabled={index === 0}
                      onClick={() => move(project.id, -1)}
                    >
                      ↑
                    </IconButton>
                    <IconButton
                      label={`Move ${project.title} down`}
                      testId={`project-down-${project.id}`}
                      disabled={index === sorted.length - 1}
                      onClick={() => move(project.id, 1)}
                    >
                      ↓
                    </IconButton>
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-3 text-[0.72rem]">
                  <TextButton
                    testId={`project-publish-${project.id}`}
                    onClick={() => update(project.id, { visible: !project.visible })}
                  >
                    {project.visible ? 'Unpublish' : 'Publish'}
                  </TextButton>
                  <TextButton
                    testId={`project-feature-${project.id}`}
                    onClick={() => update(project.id, { featured: !project.featured })}
                  >
                    {project.featured ? 'Unfeature' : 'Feature'}
                  </TextButton>
                  <TextButton
                    testId={`project-duplicate-${project.id}`}
                    onClick={() => duplicate(project.id)}
                  >
                    Duplicate
                  </TextButton>
                  <TextButton
                    testId={`project-delete-${project.id}`}
                    onClick={() => setConfirmDelete(project.id)}
                  >
                    Delete
                  </TextButton>
                </div>

                {confirmDelete === project.id ? (
                  /* Two steps, because this is the one action in the panel that
                     cannot be undone by re-typing something. */
                  <p
                    role="alert"
                    data-testid={`project-confirm-${project.id}`}
                    className="mt-2 rounded-[var(--radius-md)] border border-[var(--border)] p-2 text-[0.75rem] text-[var(--text-primary)]"
                  >
                    Delete “{project.title}”? Its web address stops working.{' '}
                    <button
                      type="button"
                      data-testid={`project-delete-confirm-${project.id}`}
                      onClick={() => remove(project.id)}
                      className="underline underline-offset-4 hover:text-[var(--accent-primary)]"
                    >
                      Delete
                    </button>{' '}
                    ·{' '}
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(null)}
                      className="underline underline-offset-4"
                    >
                      Keep
                    </button>
                  </p>
                ) : null}
              </li>
            ))}
          </ul>

          <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-3">
            <Field label="Add a project" hint="The title decides the web address.">
              <input
                type="text"
                value={newTitle}
                data-testid="project-new-title"
                onChange={(event) => setNewTitle(event.target.value)}
                className={inputClass}
              />
            </Field>
            {newTitle.trim() ? (
              <p className="mt-2 font-mono text-[0.66rem] text-[var(--text-muted)]">
                /projects/{uniqueId(newTitle, takenIds)}
              </p>
            ) : null}
            <button
              type="button"
              onClick={create}
              disabled={!newTitle.trim()}
              data-testid="project-create"
              className="mt-3 rounded-[var(--radius-md)] border border-[var(--border)] px-3.5 py-2 text-[0.82rem] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-40"
            >
              Create
            </button>
          </div>
        </div>

        {/* ---- Detail ---- */}
        <div className="min-w-0" data-testid="project-detail">
          {!current ? (
            <p className="text-[0.85rem] text-[var(--text-muted)]" data-testid="project-none">
              Choose a project on the left, or add one.
            </p>
          ) : (
            <div className="space-y-6">
              <Group title="Basic information">
                <Field label="Title">
                  <input
                    type="text"
                    value={current.title}
                    data-testid="project-title"
                    onChange={(event) => update(current.id, { title: event.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field
                  label="Web address"
                  hint="Fixed when the project was created, so links that have been shared keep working."
                >
                  <p
                    data-testid="project-id"
                    className="break-all rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 font-mono text-[0.8rem] text-[var(--text-muted)]"
                  >
                    /projects/{current.id}
                  </p>
                </Field>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Category">
                    <select
                      value={current.category}
                      data-testid="project-category"
                      onChange={(event) => update(current.id, { category: event.target.value })}
                      className={inputClass}
                    >
                      {CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Year">
                    <input
                      type="text"
                      value={current.year}
                      data-testid="project-year"
                      onChange={(event) => update(current.id, { year: event.target.value })}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Status">
                    <select
                      value={current.status}
                      data-testid="project-status"
                      onChange={(event) => update(current.id, { status: event.target.value })}
                      className={inputClass}
                    >
                      {STATUSES.map((value) => (
                        <option key={value || 'none'} value={value}>
                          {value || '— none —'}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </Group>

              <Group title="Company and experience">
                <Field
                  label="Company"
                  hint="A project whose company is removed still appears on the site — it just loses the employer line."
                >
                  <select
                    value={current.companyId}
                    data-testid="project-company"
                    onChange={(event) => update(current.id, { companyId: event.target.value })}
                    className={inputClass}
                  >
                    <option value="">— none —</option>
                    {(companies ?? []).map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name || company.id}
                      </option>
                    ))}
                    {current.companyId && !(companies ?? []).some((c) => c.id === current.companyId) ? (
                      <option value={current.companyId}>{current.companyId} (missing)</option>
                    ) : null}
                  </select>
                </Field>
                <CheckList
                  label="Roles"
                  testId="project-roles"
                  options={(roles ?? []).map((role) => ({
                    id: role.id,
                    label: role.designation || role.id,
                  }))}
                  selected={current.experienceIds}
                  onChange={(experienceIds) => update(current.id, { experienceIds })}
                />
              </Group>

              <Group title="Skills and technologies">
                <CheckList
                  label="Skill areas this project exercises"
                  testId="project-skills"
                  options={(skills ?? []).map((group) => ({ id: group.id, label: group.name }))}
                  selected={current.skillIds}
                  onChange={(skillIds) => update(current.id, { skillIds })}
                />
                <Field label="Technologies" hint="One per line. Shown as chips on the project page.">
                  <TextArea
                    rows={5}
                    value={lines(current.technologies)}
                    testId="project-technologies"
                    onChange={(text) => update(current.id, { technologies: toLines(text) })}
                  />
                </Field>
              </Group>

              <Group title="Description">
                <Field label="In one line, for a non-technical reader">
                  <TextArea
                    rows={2}
                    value={current.businessView}
                    testId="project-business-view"
                    onChange={(businessView) => update(current.id, { businessView })}
                  />
                </Field>
                <Field label="In one line, for an engineer">
                  <TextArea
                    rows={2}
                    value={current.technicalView}
                    onChange={(technicalView) => update(current.id, { technicalView })}
                  />
                </Field>
                <Field label="The problem">
                  <TextArea
                    rows={3}
                    value={current.problem}
                    onChange={(problem) => update(current.id, { problem })}
                  />
                </Field>
                <Field label="The solution">
                  <TextArea
                    rows={3}
                    value={current.solution}
                    onChange={(solution) => update(current.id, { solution })}
                  />
                </Field>
                <Field label="Your role">
                  <TextArea
                    rows={2}
                    value={current.role}
                    onChange={(role) => update(current.id, { role })}
                  />
                </Field>
              </Group>

              <Group title="Delivery and impact">
                <Field label="How it was delivered" hint="One step per line.">
                  <TextArea
                    rows={5}
                    value={lines(current.process)}
                    onChange={(text) => update(current.id, { process: toLines(text) })}
                  />
                </Field>
                <Field label="What changed because of it" hint="One per line. Only what you can stand behind.">
                  <TextArea
                    rows={5}
                    value={lines(current.impact)}
                    testId="project-impact"
                    onChange={(text) => update(current.id, { impact: toLines(text) })}
                  />
                </Field>
              </Group>

              <Group title="Links">
                {(['live', 'github', 'caseStudy'] as const).map((key) => (
                  <Field
                    key={key}
                    label={key === 'caseStudy' ? 'Write-up' : key === 'live' ? 'Live site' : 'Source'}
                    hint="Must start with https://. Anything else is dropped on save."
                  >
                    <input
                      type="url"
                      value={current.links[key] ?? ''}
                      data-testid={`project-link-${key}`}
                      onChange={(event) =>
                        update(current.id, {
                          links: { ...current.links, [key]: event.target.value },
                        })
                      }
                      className={inputClass}
                    />
                  </Field>
                ))}
              </Group>
            </div>
          )}
        </div>
      </div>

      {readOnly ? null : (
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[var(--border-subtle)] pt-4">
          <button
            type="button"
            onClick={save}
            disabled={status.kind === 'saving'}
            data-testid="project-save"
            className="rounded-[var(--radius-md)] bg-[var(--accent-primary)] px-5 py-2.5 text-[0.9rem] font-medium text-white disabled:opacity-50"
          >
            {status.kind === 'saving' ? 'Saving…' : 'Save projects'}
          </button>
          {status.kind === 'saved' ? (
            <p role="status" data-testid="project-status" className="text-[0.82rem] text-[var(--accent-primary)]">
              {status.pendingDeploy
                ? 'Saved and committed. The site will show it after the next deployment.'
                : 'Saved to your project files. Reload the public page to see it.'}
            </p>
          ) : null}
          {status.kind === 'conflict' ? (
            <p role="alert" data-testid="project-conflict" className="text-[0.82rem] text-[var(--text-primary)]">
              {status.message}{' '}
              <button
                type="button"
                onClick={reload}
                className="underline underline-offset-4 hover:text-[var(--accent-primary)]"
              >
                Reload
              </button>
            </p>
          ) : null}
          {status.kind === 'error' ? (
            <p role="alert" data-testid="project-error" className="text-[0.82rem] text-[var(--text-primary)]">
              {status.message}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-4">
      <legend className="px-1 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-[var(--text-muted)]">
        {title}
      </legend>
      <div className="space-y-3">{children}</div>
    </fieldset>
  );
}

function CheckList({
  label,
  testId,
  options,
  selected,
  onChange,
}: {
  label: string;
  testId: string;
  options: readonly { id: string; label: string }[];
  selected: readonly string[];
  onChange: (next: string[]) => void;
}) {
  // A reference that no longer resolves stays visible and checked, marked
  // missing. Dropping it silently would hide the fact that something needs
  // fixing — the project would just quietly stop linking to it.
  const orphans = selected.filter((id) => !options.some((option) => option.id === id));

  return (
    <div data-testid={testId}>
      <span className="block text-[0.85rem] font-medium text-[var(--text-primary)]">{label}</span>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
        {options.map((option) => (
          <label key={option.id} className="flex items-center gap-2 text-[0.82rem]">
            <input
              type="checkbox"
              checked={selected.includes(option.id)}
              data-testid={`${testId}-${option.id}`}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...selected, option.id]
                    : selected.filter((entry) => entry !== option.id),
                )
              }
            />
            {option.label}
          </label>
        ))}
        {orphans.map((id) => (
          <label key={id} className="flex items-center gap-2 text-[0.82rem] text-[var(--text-muted)]">
            <input
              type="checkbox"
              checked
              data-testid={`${testId}-missing-${id}`}
              onChange={() => onChange(selected.filter((entry) => entry !== id))}
            />
            {id} (missing)
          </label>
        ))}
        {options.length === 0 && orphans.length === 0 ? (
          <span className="text-[0.8rem] text-[var(--text-muted)]">Nothing to choose from yet.</span>
        ) : null}
      </div>
    </div>
  );
}

function Tag({ on, onLabel, offLabel }: { on: boolean; onLabel: string; offLabel: string }) {
  if (!on && !offLabel) return null;
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider',
        on
          ? 'bg-[color-mix(in_srgb,var(--accent-primary)_16%,transparent)] text-[var(--accent-primary)]'
          : 'border border-[var(--border-subtle)] text-[var(--text-muted)]',
      )}
    >
      {on ? onLabel : offLabel}
    </span>
  );
}

function IconButton({
  children,
  label,
  testId,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  testId: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      data-testid={testId}
      disabled={disabled}
      onClick={onClick}
      className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-1.5 py-0.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function TextButton({
  children,
  testId,
  onClick,
}: {
  children: React.ReactNode;
  testId: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className="text-[var(--text-muted)] underline-offset-4 hover:text-[var(--accent-primary)] hover:underline"
    >
      {children}
    </button>
  );
}
