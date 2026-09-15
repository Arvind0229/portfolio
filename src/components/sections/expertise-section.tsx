import { IconTile, type IconName } from '@/components/icons';
import { Reveal } from '@/components/ui';
import { expertisePillars } from '@/data/impact';
import { skillGroups } from '@/data/skills';

/* Presentation-only lookups — see the note in impact-section.tsx for why
   these live beside the components rather than in the data modules. The
   fallbacks matter: adding a pillar or a skill group to the data must never
   be able to crash a page just because nobody picked an icon for it. */
const PILLAR_ICONS: readonly IconName[] = ['layers', 'gear', 'shield', 'chart'];
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
export function ExpertiseSection() {
  return (
    <>
      <div className="clay-rotate mt-14 grid gap-4 md:grid-cols-2">
        {expertisePillars.map((pillar, index) => (
          <Reveal key={pillar.id} delay={index * 70}>
            <article className="surface-card card-reactive h-full p-6 transition-transform duration-[var(--motion-base)] hover:-translate-y-1 hover:border-[var(--accent-primary)]">
              <div className="flex items-center gap-3">
                <IconTile name={PILLAR_ICONS[index % PILLAR_ICONS.length] ?? 'sparkle'} />
                <span
                  aria-hidden="true"
                  className="font-mono text-[0.7rem] tracking-[0.18em] text-[var(--text-subtle)]"
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>
              <h2 className="mt-4 font-display text-[1.08rem]">{pillar.title}</h2>
              <p className="mt-2.5 text-[0.9rem] leading-relaxed text-[var(--text-secondary)]">
                {pillar.description}
              </p>
              <ul className="mt-4 space-y-2">
                {pillar.points.map((point) => (
                  <li
                    key={point}
                    className="flex gap-2.5 text-[0.85rem] text-[var(--text-muted)]"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--accent-primary)]"
                    />
                    {point}
                  </li>
                ))}
              </ul>
            </article>
          </Reveal>
        ))}
      </div>

      <div className="mt-20">
        <Reveal>
          <h2 className="font-display text-[1.5rem]">Tools, technologies and domains</h2>
          <p className="mt-2 max-w-2xl text-[0.95rem] text-[var(--text-secondary)]">
            Grouped the way the work is actually organised. Where each of these was
            applied is on the projects page — no proficiency bars, because invented
            numbers help nobody.
          </p>
        </Reveal>

        <div className="clay-rotate mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {skillGroups.map((group, index) => (
            <Reveal key={group.id} delay={index * 60}>
              <article className="surface-card h-full p-5 transition-[border-color] duration-[var(--motion-base)] hover:border-[var(--accent-primary)]">
                <div className="flex items-center gap-3">
                  <IconTile name={groupIcon(group.id)} size="sm" />
                  <h3 className="font-display text-[1rem]">{group.name}</h3>
                </div>
                <p className="mt-3 text-[0.8rem] leading-relaxed text-[var(--text-muted)]">
                  {group.description}
                </p>
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {group.skills.map((skill) => (
                    <li
                      key={skill}
                      className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-2.5 py-1 text-[0.76rem] text-[var(--text-secondary)]"
                    >
                      {skill}
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </>
  );
}
