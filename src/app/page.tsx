import Link from 'next/link';
import { AboutSection } from '@/components/sections/about-section';
import { ContactSection } from '@/components/sections/contact-section';
import { ExperienceSection } from '@/components/sections/experience-section';
import { ExpertiseSection } from '@/components/sections/expertise-section';
import { Hero } from '@/components/sections/hero';
import { ImpactSection } from '@/components/sections/impact-section';
import { JourneySection } from '@/components/sections/journey-section';
import { ProjectsSection } from '@/components/sections/projects-section';
import { ReportingShowcase } from '@/components/sections/reporting-showcase';
import { ResumeSection } from '@/components/sections/resume-section';
import { SkillsSection } from '@/components/sections/skills-section';
import { SkillExplainerProvider } from '@/components/skills/skill-explainer';
import { SectionHeading } from '@/components/ui';

/**
 * Home — the whole portfolio, in one scroll.
 *
 * ## Why this replaced a page per section
 *
 * The previous shape gave each area its own route, which was defensible: a
 * recruiter forwarding "his projects" gets a URL that lands exactly there. But
 * it made *reading the site* a series of decisions. Finish a page, and nothing
 * happens — you have to go back to the bar, pick the next label, and click. A
 * visitor who wants the whole story has to ask for it seven times, and most
 * will simply stop after the second.
 *
 * Scrolling now moves through the profile in the order it should be read, and
 * the bar highlights where you are as you pass each section. Clicking is still
 * there — it is just no longer the only way forward. That is the difference
 * between navigation you *may* use and navigation you *must* use.
 *
 * ## What that costs, and why it is still right
 *
 * One page means one `<title>` and one meta description rather than seven, and
 * it means everything is in the DOM at once. The first is a real SEO trade and
 * is accepted deliberately: for a portfolio, one strong page carrying every
 * keyword competes better than seven thin ones, and the case studies — which
 * are the pages worth ranking individually — are still their own routes. The
 * second is measured rather than assumed; the sections are markup and CSS, and
 * the only heavy interactive pieces (the assistant, the case studies) are
 * still on separate routes.
 *
 * Every old section URL 308s to its anchor here, so nothing that was ever
 * linked or indexed breaks.
 *
 * ## Anchors and the sticky header
 *
 * Each block carries an `id` and `scroll-mt-28`. Without the scroll margin the
 * browser aligns a section's top edge with the viewport's top edge — which is
 * underneath the floating header, so the heading you jumped to is the one
 * thing you cannot see.
 */
export default function HomePage() {
  return (
    <SkillExplainerProvider>
      <Hero />

      <div className="mx-auto w-full max-w-[76rem] px-5 pb-24 sm:px-8">
        <Section
          id="about"
          eyebrow="Profile"
          title="Turning manual lending work into running software"
          description="Nearly three years of building automations that stay alive in production — and the domain knowledge that makes the requirements land correctly in the first place."
        >
          <AboutSection />

          <div className="mt-16">
            <SectionHeading
              eyebrow="Journey"
              title="Education, and the path into automation"
              description="Education gave the grounding; automation gave it a purpose. Every date and title here comes straight from the resume."
            />
            <JourneySection />
          </div>

          <div id="resume" className="mt-16 scroll-mt-28">
            <SectionHeading
              eyebrow="Resume"
              title="The document itself"
              description="Everything on this page is drawn from this one file. Take it with you."
            />
            <ResumeSection />
          </div>
        </Section>

        <Section
          id="experience"
          eyebrow="Experience"
          title="A journey of learning, building and creating impact"
          description="From IT Executive to on-role RPA Developer, recognised for ownership and delivery performance."
        >
          <ExperienceSection />
        </Section>

        <Section
          id="projects"
          eyebrow="Projects"
          title="Case studies, not screenshots"
          description="Each one states the problem, the solution, his role and what changed. Filter or search, then open the full study."
        >
          <ProjectsSection />
        </Section>

        <Section
          id="skills"
          eyebrow="Skills"
          title="Tools, technologies and the judgement behind them"
          description="What decides whether an automation programme delivers or quietly stalls — and the stack it is built on. Every tool is clickable for what it is and why it is used."
        >
          <ExpertiseSection />
          <SkillsSection />
        </Section>

        <Section
          id="impact"
          eyebrow="Impact"
          title="What the automations actually changed"
          description="Only figures the resume supports. The reporting showcase below reproduces the layouts with illustrative data — never real records."
        >
          <ImpactSection />
          <ReportingShowcase />
        </Section>

        <Section
          id="contact"
          eyebrow="Contact"
          title="Let's talk about the automation you need built"
          description="Open to opportunities, collaborations and interesting problems. Fastest route is email; phone works too."
        >
          <ContactSection />
        </Section>

        {/* The two routes that are deliberately not part of this scroll. The
            assistant is a conversation, not a section — dropping a chat box
            mid-page invites people to type into it while scrolling past. The
            architecture page is a demonstration that runs on a timer and
            deserves the viewport to itself. */}
        <section aria-labelledby="more-heading" className="mt-24">
          <SectionHeading
            eyebrow="More"
            title="Two things that need their own room"
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Elsewhere
              href="/assistant"
              label="Ask my AI"
              blurb="Ask anything about the profile. It answers only from the resume, and says so when something is not in it."
            />
            <Elsewhere
              href="/architecture"
              label="Architecture"
              blurb="The delivery lifecycle and the runtime shape of a bot, with a run playing through its steps."
            />
          </div>
        </section>
      </div>
    </SkillExplainerProvider>
  );
}

/**
 * One scroll section.
 *
 * The `id` is the anchor the nav bar targets and the scroll-spy watches, so it
 * has to match the ids in `src/data/site.ts` — a mismatch is a nav item that
 * highlights for nothing and a link that scrolls nowhere. A test asserts every
 * nav anchor resolves to an element on this page.
 */
function Section({
  id,
  eyebrow,
  title,
  description,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="mt-24 scroll-mt-28">
      <div id={`${id}-heading`}>
        <SectionHeading eyebrow={eyebrow} title={title} description={description} />
      </div>
      {children}
    </section>
  );
}

function Elsewhere({
  href,
  label,
  blurb,
}: {
  href: string;
  label: string;
  blurb: string;
}) {
  return (
    <Link
      href={href}
      className="surface-card card-reactive group flex h-full flex-col p-6 transition-[transform,border-color] duration-[var(--motion-base)] hover:-translate-y-0.5 hover:border-[var(--accent-primary)]"
    >
      <p className="font-display text-[1.05rem]">{label}</p>
      <p className="mt-2 flex-1 text-[0.88rem] leading-relaxed text-[var(--text-secondary)]">
        {blurb}
      </p>
      <span className="mt-4 inline-flex items-center gap-1.5 text-[0.82rem] font-medium text-[var(--accent-primary)]">
        Open
        <span
          aria-hidden="true"
          className="transition-transform duration-[var(--motion-fast)] group-hover:translate-x-1"
        >
          →
        </span>
      </span>
    </Link>
  );
}
