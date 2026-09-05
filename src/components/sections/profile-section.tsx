import { Reveal, Section, SectionHeading } from '@/components/ui';
import { expertisePillars } from '@/data/impact';
import { domainKnowledge, education, profile } from '@/data/profile';

export function ProfileSection() {
  return (
    <Section id="profile" ariaLabel="Professional profile">
      <SectionHeading
        eyebrow="Profile"
        title="Two years of turning manual lending operations into running software"
      />

      <div className="mt-12 grid gap-10 lg:grid-cols-[1.45fr_1fr]">
        <Reveal>
          <p className="text-[1.02rem] leading-[1.75] text-[var(--text-secondary)]">
            {profile.summary}
          </p>

          <div className="hairline my-8" />

          <h3 className="text-[0.95rem] font-semibold">Banking &amp; lending domain</h3>
          <ul className="mt-4 flex flex-wrap gap-2">
            {domainKnowledge.map((item) => (
              <li
                key={item}
                className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-2.5 py-1 text-[0.76rem] text-[var(--text-muted)]"
              >
                {item}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={120}>
          <div className="surface-card p-6">
            <h3 className="text-[0.95rem] font-semibold">At a glance</h3>
            <dl className="mt-4 space-y-3.5 text-[0.88rem]">
              <Row label="Current role" value={`${profile.title}, SBFC Finance Limited`} />
              <Row label="Based in" value={profile.location} />
              <Row label="Primary platform" value="TruBot (Datamatics)" />
              <Row label="Also hands-on" value="Automation Edge, UiPath (basic)" />
              <Row label="Databases" value="Oracle, MS SQL, MySQL, PostgreSQL, Redshift" />
              <Row label="Reporting" value="Power BI, Advanced Excel, HTML mailers" />
            </dl>

            <div className="hairline my-6" />

            <h3 className="text-[0.95rem] font-semibold">Education</h3>
            <ul className="mt-3 space-y-3">
              {education.map((item) => (
                <li key={item.id}>
                  <p className="text-[0.85rem] text-[var(--text-primary)]">{item.qualification}</p>
                  <p className="text-[0.78rem] text-[var(--text-muted)]">
                    {item.institution} · {item.period}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>

      <div id="expertise" className="scroll-mt-24 pt-24">
        <SectionHeading
          eyebrow="Expertise"
          title="What I actually bring to an automation team"
          description="Four things that decide whether an automation programme delivers or quietly stalls."
        />

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {expertisePillars.map((pillar, index) => (
            <Reveal key={pillar.id} delay={index * 70}>
              <article className="surface-card h-full p-6 hover:-translate-y-0.5 hover:border-[var(--accent-primary)]">
                <h3 className="text-[1.05rem]">{pillar.title}</h3>
                <p className="mt-2.5 text-[0.9rem] leading-relaxed text-[var(--text-secondary)]">
                  {pillar.description}
                </p>
                <ul className="mt-4 space-y-2">
                  {pillar.points.map((point) => (
                    <li
                      key={point}
                      className="flex gap-2.5 text-[0.85rem] text-[var(--text-muted)]"
                    >
                      <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--accent-primary)]" />
                      {point}
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5">
      <dt className="w-[7.5rem] shrink-0 text-[var(--text-muted)]">{label}</dt>
      <dd className="min-w-0 flex-1 text-[var(--text-primary)]">{value}</dd>
    </div>
  );
}
