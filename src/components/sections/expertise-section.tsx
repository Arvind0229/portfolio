import { IconTile, type IconName } from '@/components/icons';
import { Reveal } from '@/components/ui';
import { expertisePillars } from '@/data/impact';

/* Presentation-only lookups — see the note in impact-section.tsx for why
   these live beside the components rather than in the data modules. The
   fallbacks matter: adding a pillar or a skill group to the data must never
   be able to crash a page just because nobody picked an icon for it. */
const PILLAR_ICONS: readonly IconName[] = ['layers', 'gear', 'shield', 'chart'];
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

        {/* The grouped stack itself is `SkillsSection`, directly below: one
            list, theme-coloured, and every tool opens its explainer. It used
            to be drawn twice — here as coloured cards whose chips did
            nothing, and again below as plain cards whose chips opened the
            popup. Arvind spotted the duplicate on 2026-09-21. */}
      </div>
    </>
  );
}
