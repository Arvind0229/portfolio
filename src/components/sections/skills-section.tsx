'use client';

import { useMemo } from 'react';
import { IconTile, type IconName } from '@/components/icons';
import { SkillChip, SkillExplainerProvider } from '@/components/skills/skill-explainer';
import { Reveal } from '@/components/ui';
import { EmptyState } from '@/components/states/empty-state';
import { skillGroups } from '@/data/skills';
import { clearHighlightTerm, useHighlightTerm } from '@/lib/search/highlight-store';
import { cn } from '@/lib/utils/cn';

/**
 * Technology stack.
 *
 * No proficiency bars and no percentages: they are invented numbers, and a
 * reviewer who has seen a hundred portfolios discounts them immediately. The
 * groups mirror the resume.
 *
 * ## Where the search went
 *
 * This section used to own a search box. It no longer does — there is one
 * search for the whole site, in the header, and it covers the stack along with
 * the projects and the sections. Two boxes meant a visitor had to know which
 * half of the site a word lived in before they could look for it.
 *
 * What is left here is the *result* of that search: when someone picks a
 * technology in the palette, the term arrives through the highlight store and
 * this section filters to the groups that contain it.
 *
 * ## Why the filter announces itself
 *
 * A filtered grid with no visible control is a trap: the visitor scrolls back
 * later, finds three of nine groups, and has nothing to click to get the rest.
 * So a filtered state shows what it is filtered by and how to clear it. The
 * control appears only when there is something to clear — an always-present
 * "clear" button implies a filter is always on.
 */
/* Icons per group — moved here from expertise-section.tsx when the two
   duplicate grids became one. */
const GROUP_ICONS: Record<string, IconName> = {
  rpa: 'bot',
  automation: 'bot',
  programming: 'code',
  scripting: 'code',
  data: 'database',
  databases: 'database',
  reporting: 'chart',
  analytics: 'chart',
  domain: 'shield',
  platforms: 'layers',
  tools: 'gear',
};

function groupIcon(id: string): IconName {
  const key = Object.keys(GROUP_ICONS).find((candidate) => id.includes(candidate));
  return (key ? GROUP_ICONS[key] : undefined) ?? 'sparkle';
}

/**
 * Expertise.
 *
 * Four pillars that decide whether an automation programme delivers, each
 * backed by the concrete practices behind it, then the stack grouped the way
 * the work is organised.
 */
export function SkillsSection() {
  const term = useHighlightTerm();
  const needle = term.trim().toLowerCase();

  const groups = useMemo(() => {
    if (!needle) return skillGroups.map((group) => ({ group, matches: group.skills }));
    return skillGroups
      .map((group) => ({
        group,
        matches: group.skills.filter((skill) => skill.toLowerCase().includes(needle)),
      }))
      .filter((entry) => entry.matches.length > 0);
  }, [needle]);

  const total = groups.reduce((sum, entry) => sum + entry.matches.length, 0);

  return (
    <SkillExplainerProvider>
      <section className="mt-10 scroll-mt-24">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-[var(--border-subtle)] pb-4">
          <h3 className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-[var(--text-muted)]">
            The stack, by group
          </h3>

          {needle ? (
            <button
              type="button"
              onClick={clearHighlightTerm}
              data-testid="skill-filter-clear"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-primary)] bg-[color-mix(in_srgb,var(--accent-primary)_10%,transparent)] px-3 py-1.5 text-[0.78rem] text-[var(--accent-primary)] transition-colors duration-[var(--motion-fast)] hover:bg-[color-mix(in_srgb,var(--accent-primary)_18%,transparent)]"
            >
              <span>
                Filtered by “{term}” — {total} shown
              </span>
              <span aria-hidden="true">×</span>
              <span className="sr-only">Clear the filter and show the whole stack</span>
            </button>
          ) : (
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-[var(--text-subtle)]">
              {total} technologies
            </p>
          )}
        </div>

        {/* Announced, not drawn: a sighted visitor sees the grid change. */}
        <p className="sr-only" role="status" aria-live="polite">
          {total} technologies shown
        </p>

        {groups.length === 0 ? (
          <div className="mt-10">
            <EmptyState
              testId="skill-filter-empty"
              title={`Nothing in the stack matches “${term}”`}
              action={
                <button type="button" onClick={clearHighlightTerm} className="fx-btn empty-clear">
                  Show the whole stack
                </button>
              }
            >
              That does not mean he could not learn it — it means it is not something the resume
              can claim.
            </EmptyState>
          </div>
        ) : (
          <div className="clay-rotate mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groups.map(({ group, matches }, index) => (
              <Reveal key={group.id} delay={index * 60}>
                <article className="surface-card card-reactive skill-group h-full p-5">
                  <div className="flex items-center gap-3">
                    <IconTile name={groupIcon(group.id)} size="sm" />
                    <h3 className="font-display text-[1rem]">{group.name}</h3>
                  </div>
                  <p className="mt-3 text-[0.8rem] leading-relaxed text-[var(--text-muted)]">
                    {group.description}
                  </p>
                  <ul className="mt-4 flex flex-wrap gap-1.5">
                    {matches.map((skill) => {
                      const hit = Boolean(needle && skill.toLowerCase().includes(needle));
                      return (
                        <li key={skill}>
                          <SkillChip
                            skill={skill}
                            highlighted={hit}
                            className={cn(
                              'rounded-[var(--radius-sm)] border px-2.5 py-1 text-[0.76rem]',
                              hit
                                ? ''
                                : 'border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-secondary)]',
                            )}
                          />
                        </li>
                      );
                    })}
                  </ul>
                </article>
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </SkillExplainerProvider>
  );
}
