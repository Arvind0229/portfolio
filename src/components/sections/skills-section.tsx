'use client';

import { useMemo, useState } from 'react';
import { SkillChip, SkillExplainerProvider } from '@/components/skills/skill-explainer';
import { SkillSearch } from '@/components/skills/skill-search';
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
        {/*
          A row with a purpose, rather than a box floating between two grids.

          The heading names what the search searches, which is what the old
          layout was missing: the field sat alone between the expertise cards
          and the stack cards, belonging to neither. Now the label and the
          control are one line, and the grid below is plainly what they act on.
        */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-[var(--border-subtle)] pb-4">
          <h3 className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-[var(--text-muted)]">
            The stack, by group
          </h3>
          <SkillSearch
            value={query}
            onChange={setQuery}
            resultCount={total}
            className="w-full sm:w-auto"
          />
        </div>

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
