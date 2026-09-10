'use client';

import { useId, useMemo, useState } from 'react';
import { SkillChip, SkillExplainerProvider } from '@/components/skills/skill-explainer';
import { Reveal } from '@/components/ui';
import { skillGroups } from '@/data/skills';
import { cn } from '@/lib/utils/cn';

/**
 * Technology stack.
 *
 * No proficiency bars and no percentages: they are invented numbers, and a
 * reviewer who has seen a hundred portfolios discounts them immediately. The
 * groups mirror the resume, and search exists because a recruiter with a job
 * description in hand wants to check one specific word.
 */
export function SkillsSection() {
  const [query, setQuery] = useState('');
  const searchId = useId();

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return skillGroups.map((group) => ({ group, matches: group.skills }));
    return skillGroups
      .map((group) => ({
        group,
        matches: group.skills.filter((skill) => skill.toLowerCase().includes(needle)),
      }))
      .filter((entry) => entry.matches.length > 0);
  }, [query]);

  const total = groups.reduce((sum, entry) => sum + entry.matches.length, 0);

  return (
    <SkillExplainerProvider>
      <section className="scroll-mt-24">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="lg:pb-2">
            <label htmlFor={searchId} className="sr-only">
              Search the technology stack
            </label>
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search a technology…"
              data-testid="skill-search"
              className="w-full min-w-[15rem] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-[0.85rem] text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus-visible:border-[var(--accent-primary)]"
            />
          </div>
        </div>

        <p className="sr-only" role="status" aria-live="polite">
          {total} technologies shown
        </p>

        {groups.length === 0 ? (
          <p className="surface-card mt-10 p-10 text-center text-[0.95rem] text-[var(--text-secondary)]">
            Nothing in the stack matches “{query}”. That does not mean he could not learn
            it — it means it is not something the resume can claim.
          </p>
        ) : (
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groups.map(({ group, matches }, index) => (
              <Reveal key={group.id} delay={index * 60}>
                <article className="surface-card h-full p-5">
                  <h3 className="text-[1rem]">{group.name}</h3>
                  <p className="mt-1.5 text-[0.8rem] leading-relaxed text-[var(--text-muted)]">
                    {group.description}
                  </p>
                  <ul className="mt-4 flex flex-wrap gap-1.5">
                    {matches.map((skill) => (
                      <li key={skill}>
                        <SkillChip
                          skill={skill}
                          highlighted={Boolean(
                            query &&
                            skill.toLowerCase().includes(query.trim().toLowerCase()),
                          )}
                          className={cn(
                            'rounded-[var(--radius-sm)] border px-2.5 py-1 text-[0.76rem]',
                            query &&
                              skill.toLowerCase().includes(query.trim().toLowerCase())
                              ? ''
                              : 'border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-secondary)]',
                          )}
                        />
                      </li>
                    ))}
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
