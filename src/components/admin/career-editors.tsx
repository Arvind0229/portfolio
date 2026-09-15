'use client';

import { Field, TextArea, inputClass, lines, toLines } from '@/components/admin/admin-panel';
import { type ContentState, useContent } from '@/components/admin/content-editors';
import { cn } from '@/lib/utils/cn';

/**
 * Companies and roles, edited as two lists that reference each other.
 *
 * ## Why two forms and not one
 *
 * A single "add a job" form would be simpler to build and wrong the second time
 * he is promoted: the company's description would be typed again, and the two
 * copies would drift. These are separate because the data is separate —
 * a company outlives the roles held at it.
 *
 * The cost is a reference the person has to get right, so the role form offers
 * a `<select>` of companies that exist rather than a text box, and a role
 * pointing at a company that has since been removed says so in place rather
 * than failing silently on the public page.
 *
 * ## Both lists are built on `useContent`
 *
 * Same hook as profile and skills, so optimistic concurrency, the conflict
 * banner and the reload action are inherited rather than reimplemented. A save
 * here conflicts exactly the way a profile save does.
 */

export interface CompanyRow {
  id: string;
  name: string;
  website: string;
  logo: string;
  location: string;
  industry: string;
  description: string;
  relevance: string;
}

export interface ExperienceRow {
  id: string;
  companyId: string;
  designation: string;
  location: string;
  employmentType: string;
  start: string;
  end: string;
  current: boolean;
  summary: string;
  responsibilities: readonly string[];
  achievements: readonly string[];
  technologies: readonly string[];
  projectIds: readonly string[];
  order: number;
  visible: boolean;
}

/** `a-b-1` — the shape both parsers accept as an id. */
function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

/* ------------------------------------------------------------------ */
/* Companies                                                           */
/* ------------------------------------------------------------------ */

/**
 * Both editors, sharing one load of the company list.
 *
 * They used to hold a `useContent('companies')` each — the company form to edit
 * it, the role form to fill its `<select>`. That is the same file fetched twice
 * per render, and in development React renders twice, so opening this section
 * made six content requests before anyone had touched anything. It tripped the
 * route's rate limiter and the panel showed an empty list with a message about
 * saves the person had not made. Found in UAT.
 *
 * One hook, passed down. The role form gets the list it needs, and it gets the
 * list *as edited* rather than as last saved — so a company added above appears
 * in the dropdown below without a round trip.
 */
export function CareerEditors() {
  const companies = useContent<CompanyRow[]>('companies');
  return (
    <div className="space-y-6">
      <CompaniesEditor state={companies} />
      <ExperienceEditor companies={companies.data ?? []} />
    </div>
  );
}

function CompaniesEditor({ state }: { state: ContentState<CompanyRow[]> }) {
  const { data: value, setData: setValue, save, status, reload, readOnly } = state;

  if (!value) {
    return (
      <Panel title="Companies" status={status} onReload={reload}>
        <p className="text-[0.85rem] text-[var(--text-muted)]">Loading…</p>
      </Panel>
    );
  }

  const update = (index: number, patch: Partial<CompanyRow>) =>
    setValue(value.map((company, i) => (i === index ? { ...company, ...patch } : company)));

  return (
    <Panel
      title="Companies"
      blurb="Each employer once. Roles point at these by name, so changing a description here changes it everywhere it appears."
      status={status}
      onReload={reload}
      onSave={readOnly ? undefined : save}
      testId="companies-editor"
    >
      <div className="space-y-4" data-testid="company-list">
        {value.map((company, index) => (
          <fieldset
            key={company.id || index}
            data-testid={`company-${company.id}`}
            className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-4"
          >
            <legend className="px-1 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-[var(--text-muted)]">
              {company.name || 'New company'}
            </legend>
            <div className="space-y-3">
              <Field label="Company name">
                <input
                  type="text"
                  value={company.name}
                  data-testid={`company-name-${company.id}`}
                  onChange={(event) => update(index, { name: event.target.value })}
                  className={inputClass}
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Industry" hint="Shown under the company name.">
                  <input
                    type="text"
                    value={company.industry}
                    onChange={(event) => update(index, { industry: event.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Location">
                  <input
                    type="text"
                    value={company.location}
                    onChange={(event) => update(index, { location: event.target.value })}
                    className={inputClass}
                  />
                </Field>
              </div>
              <Field label="Website" hint="Must start with https://. Anything else is dropped on save.">
                <input
                  type="url"
                  value={company.website}
                  data-testid={`company-website-${company.id}`}
                  onChange={(event) => update(index, { website: event.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field
                label="Logo"
                hint="A path inside this site, like /companies/acme.svg. Leave blank if there is no logo — a blank is better than a broken image."
              >
                <input
                  type="text"
                  value={company.logo}
                  onChange={(event) => update(index, { logo: event.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="What the company does" hint="Public facts, not your role there.">
                <TextArea
                  rows={3}
                  value={company.description}
                  onChange={(description) => update(index, { description })}
                />
              </Field>
              <Field
                label="Why this context matters"
                hint="Why working here is relevant to what you do. About the company, not your achievements."
              >
                <TextArea
                  rows={3}
                  value={company.relevance}
                  onChange={(relevance) => update(index, { relevance })}
                />
              </Field>
            </div>
            <button
              type="button"
              onClick={() => setValue(value.filter((_, i) => i !== index))}
              className="mt-3 text-[0.78rem] text-[var(--text-muted)] underline-offset-4 hover:text-[var(--accent-primary)] hover:underline"
            >
              Remove this company
            </button>
          </fieldset>
        ))}
      </div>

      <button
        type="button"
        data-testid="company-add"
        onClick={() =>
          setValue([
            ...value,
            {
              id: `company-${value.length + 1}`,
              name: '',
              website: '',
              logo: '',
              location: '',
              industry: '',
              description: '',
              relevance: '',
            },
          ])
        }
        className="mt-4 rounded-[var(--radius-md)] border border-[var(--border)] px-3.5 py-2 text-[0.82rem] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        Add a company
      </button>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Roles                                                               */
/* ------------------------------------------------------------------ */

function ExperienceEditor({ companies }: { companies: readonly CompanyRow[] }) {
  const { data: value, setData: setValue, save, status, reload, readOnly } =
    useContent<ExperienceRow[]>('experience');

  if (!value) {
    return (
      <Panel title="Experience" status={status} onReload={reload}>
        <p className="text-[0.85rem] text-[var(--text-muted)]">Loading…</p>
      </Panel>
    );
  }

  const known = companies;
  const update = (index: number, patch: Partial<ExperienceRow>) =>
    setValue(value.map((role, i) => (i === index ? { ...role, ...patch } : role)));

  return (
    <Panel
      title="Experience"
      blurb="One entry per role. Two roles at the same company point at the same company — do not add it twice."
      status={status}
      onReload={reload}
      onSave={readOnly ? undefined : save}
      testId="experience-editor"
    >
      <div className="space-y-4" data-testid="experience-list">
        {[...value]
          .map((role, index) => ({ role, index }))
          .sort((a, b) => a.role.order - b.role.order)
          .map(({ role, index }) => {
            const company = known.find((entry) => entry.id === role.companyId);
            return (
              <fieldset
                key={role.id || index}
                data-testid={`experience-${role.id}`}
                className={cn(
                  'rounded-[var(--radius-md)] border p-4',
                  role.visible ? 'border-[var(--border-subtle)]' : 'border-dashed border-[var(--border)]',
                )}
              >
                <legend className="px-1 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  {role.designation || 'New role'}
                  {role.visible ? '' : ' · hidden'}
                </legend>

                <div className="space-y-3">
                  <Field label="Company">
                    <select
                      value={role.companyId}
                      data-testid={`experience-company-${role.id}`}
                      onChange={(event) => update(index, { companyId: event.target.value })}
                      className={inputClass}
                    >
                      <option value="">— choose —</option>
                      {known.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.name || entry.id}
                        </option>
                      ))}
                      {/* A role whose company was removed keeps its value
                          visible instead of silently resetting to blank. */}
                      {role.companyId && !company ? (
                        <option value={role.companyId}>{role.companyId} (missing)</option>
                      ) : null}
                    </select>
                  </Field>
                  {role.companyId && !company ? (
                    <p
                      role="alert"
                      data-testid={`experience-dangling-${role.id}`}
                      className="rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 text-[0.78rem] text-[var(--text-primary)]"
                    >
                      This role points at a company that no longer exists, so it is not shown on
                      the site. Choose a company above.
                    </p>
                  ) : null}

                  <Field label="Designation">
                    <input
                      type="text"
                      value={role.designation}
                      data-testid={`experience-designation-${role.id}`}
                      onChange={(event) => update(index, { designation: event.target.value })}
                      className={inputClass}
                    />
                  </Field>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Start" hint="As it should read, e.g. Oct 2023.">
                      <input
                        type="text"
                        value={role.start}
                        onChange={(event) => update(index, { start: event.target.value })}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="End" hint="Leave blank if this is your current role.">
                      <input
                        type="text"
                        value={role.end}
                        disabled={role.current}
                        onChange={(event) => update(index, { end: event.target.value })}
                        className={cn(inputClass, role.current && 'opacity-50')}
                      />
                    </Field>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Employment type">
                      <input
                        type="text"
                        value={role.employmentType}
                        onChange={(event) => update(index, { employmentType: event.target.value })}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Location" hint="Leave blank to use the company's location.">
                      <input
                        type="text"
                        value={role.location}
                        onChange={(event) => update(index, { location: event.target.value })}
                        className={inputClass}
                      />
                    </Field>
                  </div>

                  <Field label="Summary" hint="Two or three lines. What the role was.">
                    <TextArea rows={3} value={role.summary} onChange={(summary) => update(index, { summary })} />
                  </Field>

                  <Field
                    label="Achievements"
                    hint="One per line. Outcomes with numbers where you have them — these appear first on the site."
                  >
                    <TextArea
                      rows={4}
                      value={lines(role.achievements)}
                      testId={`experience-achievements-${role.id}`}
                      onChange={(text) => update(index, { achievements: toLines(text) })}
                    />
                  </Field>

                  <Field label="Responsibilities" hint="One per line. What the job involved.">
                    <TextArea
                      rows={6}
                      value={lines(role.responsibilities)}
                      onChange={(text) => update(index, { responsibilities: toLines(text) })}
                    />
                  </Field>

                  <Field label="Technologies" hint="One per line.">
                    <TextArea
                      rows={4}
                      value={lines(role.technologies)}
                      onChange={(text) => update(index, { technologies: toLines(text) })}
                    />
                  </Field>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Display order" hint="Lower numbers appear first.">
                      <input
                        type="number"
                        value={role.order}
                        data-testid={`experience-order-${role.id}`}
                        onChange={(event) => update(index, { order: Number(event.target.value) })}
                        className={inputClass}
                      />
                    </Field>
                    <div className="flex flex-col justify-end gap-2 pb-1">
                      <label className="flex items-center gap-2 text-[0.85rem] text-[var(--text-primary)]">
                        <input
                          type="checkbox"
                          checked={role.current}
                          data-testid={`experience-current-${role.id}`}
                          onChange={(event) =>
                            update(index, {
                              current: event.target.checked,
                              end: event.target.checked ? '' : role.end,
                            })
                          }
                        />
                        This is my current role
                      </label>
                      <label className="flex items-center gap-2 text-[0.85rem] text-[var(--text-primary)]">
                        <input
                          type="checkbox"
                          checked={role.visible}
                          data-testid={`experience-visible-${role.id}`}
                          onChange={(event) => update(index, { visible: event.target.checked })}
                        />
                        Show on the site
                      </label>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setValue(value.filter((_, i) => i !== index))}
                  className="mt-3 text-[0.78rem] text-[var(--text-muted)] underline-offset-4 hover:text-[var(--accent-primary)] hover:underline"
                >
                  Remove this role
                </button>
              </fieldset>
            );
          })}
      </div>

      <button
        type="button"
        data-testid="experience-add"
        onClick={() =>
          setValue([
            ...value,
            {
              id: slug(`role-${Date.now().toString(36)}`),
              companyId: known[0]?.id ?? '',
              designation: '',
              location: '',
              employmentType: 'Full-time',
              start: '',
              end: '',
              current: false,
              summary: '',
              responsibilities: [],
              achievements: [],
              technologies: [],
              projectIds: [],
              order: value.length + 1,
              visible: true,
            },
          ])
        }
        className="mt-4 rounded-[var(--radius-md)] border border-[var(--border)] px-3.5 py-2 text-[0.82rem] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        Add a role
      </button>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Shared shell                                                        */
/* ------------------------------------------------------------------ */

function Panel({
  title,
  blurb,
  status,
  onSave,
  onReload,
  testId,
  children,
}: {
  title: string;
  blurb?: string;
  status: ReturnType<typeof useContent>['status'];
  onSave?: () => void;
  onReload: () => void;
  testId?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface-card p-5" data-testid={testId}>
      <h2 className="font-display text-[1.05rem] text-[var(--text-primary)]">{title}</h2>
      {blurb ? (
        <p className="mt-1.5 max-w-2xl text-[0.82rem] leading-relaxed text-[var(--text-secondary)]">
          {blurb}
        </p>
      ) : null}

      <div className="mt-4">{children}</div>

      {onSave ? (
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[var(--border-subtle)] pt-4">
          <button
            type="button"
            onClick={onSave}
            disabled={status.kind === 'saving'}
            data-testid={testId ? `${testId}-save` : undefined}
            className="rounded-[var(--radius-md)] bg-[var(--accent-primary)] px-5 py-2.5 text-[0.9rem] font-medium text-white disabled:opacity-50"
          >
            {status.kind === 'saving' ? 'Saving…' : `Save ${title.toLowerCase()}`}
          </button>
          {status.kind === 'saved' ? (
            <p role="status" className="text-[0.82rem] text-[var(--accent-primary)]">
              {status.pendingDeploy
                ? 'Saved and committed. The site will show it after the next deployment.'
                : 'Saved to your project files. Reload the public page to see it.'}
            </p>
          ) : null}
          {status.kind === 'conflict' ? (
            <p role="alert" className="text-[0.82rem] text-[var(--text-primary)]">
              {status.message}{' '}
              <button
                type="button"
                onClick={onReload}
                className="underline underline-offset-4 hover:text-[var(--accent-primary)]"
              >
                Reload
              </button>
            </p>
          ) : null}
          {status.kind === 'error' ? (
            <p role="alert" className="text-[0.82rem] text-[var(--text-primary)]">
              {status.message}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
