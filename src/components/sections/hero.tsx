'use client';

import { Icon, type IconName } from '@/components/icons';
import { LinkButton, Reveal, SplitText } from '@/components/ui';
import { AutomationFlow } from '@/components/visuals/automation-flow';
import { whatsappLink } from '@/lib/contact/whatsapp';
import { RobotStage } from '@/components/visuals/robot-stage';
import { impactMetrics } from '@/data/impact';
import { profile } from '@/data/profile';
import { useCountUp } from '@/hooks/use-count-up';
import { useInView } from '@/hooks/use-in-view';

/**
 * Hero.
 *
 * Answers the four questions a visitor has in the first five seconds: who is
 * this, what do they do, what do they specialise in, and what can I do next.
 * Two primary CTAs only — one into the work, one into the assistant.
 *
 * The name is the identity anchor: display face, signature gradient, and a
 * per-character rise that resolves in well under a second.
 *
 * The layout is two columns from `lg` up — words on the left, the automation
 * pipeline on the right — so the answer to "what does an RPA developer
 * actually do" is visible in the same glance as the name, not a scroll later.
 * Below `lg` the two stack and the pipeline keeps its full width, because a
 * process diagram squeezed into half a phone screen communicates nothing.
 */

/* Which icon fronts which headline number. Presentation only; see the note in
   impact-section.tsx. */
const METRIC_ICONS: Record<string, IconName> = {
  automations: 'bot',
  effort: 'bolt',
  databases: 'database',
  interns: 'users',
};
export function Hero() {

  // One observer for the whole strip rather than one per figure: the four
  // numbers sit on a single row and enter together, so four observers would
  // be four times the cost for the same moment.
  const { ref: metricsRef, inView: metricsInView } = useInView<HTMLDListElement>({
    threshold: 0.3,
  });

  const nameParts = profile.name.split(' ');
  const firstName = nameParts[0] ?? profile.name;
  const lastName = nameParts.slice(1).join(' ');

  return (
    <section
      id="top"
      className="relative mx-auto flex min-h-[94svh] w-full max-w-[76rem] flex-col justify-center px-5 pb-16 pt-28 sm:px-8 md:pt-32"
    >
      <div className="relative grid items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-8">
      {/*
        The companion.

        It lives in the hero rather than in the fixed backdrop, and that moved
        with the one-page rebuild: a `position: fixed` figure used to be
        harmless when each section was its own route, but on a single scroll it
        would hover over Experience, Projects and everything below them for
        fourteen thousand pixels. Here it belongs to the hero and scrolls away
        with it, which is where the reference puts it.

        `xl` and up only, and the offsets are measured rather than chosen.
        Six real window sizes were checked, and two faults came out of it:

          1152×720  below the fold, no room beside the panel  → not shown
          1280×720  bottom at 756 in a 720 window — 36px out  → offset raised
          1366×768  fits
          1440×860  fits
          1600×900  fits
          1920×1080 fits

        A `lg` variant was tried and dropped. Between 1024 and 1279 the panel
        fills the right column edge to edge, so the figure either lands on top
        of it or below the fold — and a companion nobody scrolls far enough to
        meet is not a companion.

        It overlaps the panel's right edge — 52% at `xl`, 30% at `2xl`,
        measured — and that is deliberate: the reference does the same, and it
        is the same idea as the figure that used to stand behind the hero
        panel, giving the glass something worth blurring.

        The fade is tuned to that overlap rather than picked. It clears 58% of
        the figure's width, so the part behind the panel is the part that has
        already faded out and only the side standing clear of the glass is
        solid. At the original 38% the overlapped half stayed opaque and read
        as a smudge under the panel rather than as something standing behind
        it.

        It hangs off the bottom of the *panel row*, not the bottom of the
        section. That distinction was a real bug: the section is
        `min-h-[94svh]` but its content is taller than that at narrower widths,
        so anchoring to the section put the figure at y=879 in an 860px-tall
        window — below the fold, on a page whose whole point is the first
        screen. The panel row is always inside the first viewport, so
        anchoring to it is stable.

        The horizontal offsets fit the *narrowest* width each breakpoint has to
        serve, not the widest: at exactly 1280 the 76rem shell leaves only 32px
        of margin to hang into, and an earlier `-right-14` put the document
        wider than the viewport. `body { overflow-x: hidden }` clipped it, so
        nothing looked wrong — which is exactly why it would have stayed.

        The left fade keeps it from cutting hard across the panel.
      */}
      {/*
        The robot now lives in its own component, mounted only on Midnight.

        It used to be mounted here unconditionally, which meant it appeared in
        every theme — Studio and Enterprise included, at half opacity. That was
        a theme-isolation defect, not a design choice. `RobotStage` returns
        null off Midnight, so the figure is absent from the DOM rather than
        merely hidden.
      */}
      <RobotStage />

        <div>
          <Reveal>
            <p className="surface-card inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-[var(--success)]"
                style={{
                  boxShadow:
                    '0 0 0 3px color-mix(in srgb, var(--success) 22%, transparent)',
                }}
              />
              {profile.availability}
            </p>
          </Reveal>

          {/*
        The name is split into characters so each can rise on entry, and each
        character is a solid colour rather than a clipped gradient. That is not
        a compromise: an animated character carries a transform, a transform
        creates a containing block, and a parent's `background-clip: text` does
        not paint into one — the gradient version rendered the name invisible.
        Two weights of one palette also matches the identity better than a
        rainbow across a person's name.
      */}
          <h1 className="mt-7 text-[clamp(2rem,7.5vw,5.5rem)] leading-[var(--leading-display)]">
            {/* One hidden string carries the whole name; the two coloured halves
            are decorative so a screen reader never hears "ArvindGupta". */}
            <span className="sr-only">{profile.name}</span>
            <span
              aria-hidden="true"
              className="flex flex-wrap items-baseline gap-x-[0.28em]"
            >
              <SplitText
                text={firstName}
                announce={false}
                className="block text-[var(--text-primary)]"
                offsetMs={120}
              />
              {lastName ? (
                /*
                 * The surname wipes in from the left behind a clip instead of
                 * rising character by character, so the two halves of the name
                 * enter differently and the surname lands last.
                 *
                 * The colour is `--accent-display`, not `--accent-primary`:
                 * the brand coral is 2.35:1 on the clay ground and cannot
                 * carry text at any size. The display value clears the 3:1
                 * that large text needs. Themes without it fall back.
                 */
                <span className="surname-wipe block text-[var(--accent-display,var(--accent-primary))]">
                  {lastName}
                </span>
              ) : null}
            </span>
            <Reveal delay={520}>
              <span className="mt-2 block text-[clamp(1rem,2.8vw,1.9rem)] font-normal tracking-[-0.01em] text-[var(--text-secondary)]">
                {profile.title} — Banking, NBFC &amp; Retail Lending Automation
              </span>
            </Reveal>
          </h1>

          <Reveal delay={600}>
            <p className="mt-7 max-w-2xl text-[clamp(0.95rem,2.2vw,1.15rem)] leading-relaxed text-[var(--text-secondary)]">
              {profile.positioning}
            </p>
          </Reveal>

          <Reveal delay={660}>
            <ul className="mt-7 flex flex-wrap gap-2" aria-label="Focus areas">
              {profile.focusAreas.map((area) => (
                <li
                  key={area}
                  className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 py-1.5 text-[0.76rem] text-[var(--text-secondary)] transition-colors duration-[var(--motion-fast)] hover:border-[var(--accent-primary)] hover:text-[var(--text-primary)]"
                >
                  {area}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={720}>
            <div className="mt-9 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
              <LinkButton href="#projects" size="lg" className="w-full sm:w-auto text-center justify-center">
                Explore the work
                <span
                  aria-hidden="true"
                  className="transition-transform duration-[var(--motion-fast)] group-hover:translate-x-1"
                >
                  →
                </span>
              </LinkButton>
              <LinkButton href="/assistant" variant="secondary" size="lg" className="w-full sm:w-auto text-center justify-center">
                Ask my AI assistant
              </LinkButton>
              <LinkButton
                href={profile.resume.pdf}
                variant="ghost"
                size="lg"
                download
                aria-label="Download resume as PDF"
                className="download-cta w-full sm:w-auto text-center justify-center"
              >
                Download resume
                {/* The tray the arrow drops into. Drawn rather than an icon so
                    it can be two separate pieces — the arrow moves, the tray
                    does not, which is what makes it read as *downloading*
                    rather than as an arrow sliding. */}
                <span aria-hidden="true" className="download-glyph">
                  <span className="download-arrow" />
                  <span className="download-tray" />
                </span>
              </LinkButton>

              {/*
                WhatsApp, next to the resume.

                It has always existed in the Resume section and still does —
                what was missing is that a visitor reading the hero had no way
                to reach it without scrolling. Same `whatsappLink()` helper and
                the same icon, so there is one source for the number.
              */}
              <a
                href={whatsappLink()}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="hero-whatsapp"
                aria-label="Message Arvind on WhatsApp"
                className="wa-press clay-control group inline-flex h-[54px] w-[54px] shrink-0 items-center justify-center self-center rounded-[var(--r-button,var(--radius-md))] border border-[color-mix(in_srgb,var(--whatsapp)_38%,var(--border))] text-[var(--whatsapp)] transition-[border-color,box-shadow,transform] duration-[var(--motion-fast)] hover:border-[var(--whatsapp)] hover:shadow-[0_0_0_3px_color-mix(in_srgb,var(--whatsapp)_16%,transparent)]"
              >
                <Icon name="whatsapp" size={22} aria-hidden="true" />
              </a>
            </div>
          </Reveal>
        </div>

        {/*
          The graph: what the job actually is, drawn rather than described.

          The linear pipeline still lives on the architecture page and the case
          studies, where it belongs — the delivery cycle really is a sequence.
          The runtime is not, so the hero shows it as the graph it is: a bot in
          the middle, systems feeding it, a result coming out. Same idea, the
          right shape for each place.
        */}
        <Reveal delay={780} className="lg:mt-0">
          <div className="glass p-4 sm:p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <p className="font-mono text-[0.66rem] uppercase tracking-[0.22em] text-[var(--accent-primary)]">
                Ideas → bots → impact
              </p>
              <p className="text-[0.74rem] text-[var(--text-muted)]">Automate today</p>
            </div>
            <AutomationFlow className="mt-4" />
          </div>
        </Reveal>
      </div>

      {/* Headline numbers, full width under both columns: one strip with
          dividers rather than four cards, so it reads as a summary line of the
          hero rather than as the start of a new section.

          The icon sits inside the `dt`, not in a wrapper beside it. A `div`
          child of a `dl` is valid HTML only when it contains nothing but `dt`
          and `dd` — putting the icon in that wrapper made every term and
          definition here an orphan, which axe reported as `definition-list`
          plus eight `dlitem` violations. Inside the `dt` it is both valid and
          better placed: it labels the label. */}
      <Reveal delay={840}>
        <dl
          ref={metricsRef}
          className="clay-metrics surface-card mt-12 grid grid-cols-2 gap-x-3 gap-y-6 p-4 sm:p-7 md:grid-cols-4 md:gap-x-0"
        >
          {impactMetrics.map((metric, index) => (
            <div
              key={metric.id}
              className={
                index > 0
                  ? 'min-w-0 md:border-l md:border-[var(--border-subtle)] md:pl-6'
                  : 'min-w-0 md:pr-6'
              }
            >
              <HeroMetric metric={metric} start={metricsInView} delay={index * 110} />
            </div>
          ))}
        </dl>
      </Reveal>
    </section>
  );
}

/**
 * A headline figure that counts up when the strip reaches the viewport.
 *
 * The numbers are the hook of the hero, and a static "80+" is read past. The
 * count is staggered across the four so they resolve left to right rather than
 * flickering as one block — the same reason the graph's packets are staggered.
 *
 * The label is a `dt` and the figure a `dd`, so the pair still reads as a
 * definition list to assistive technology; the animation is on the value
 * inside, and reduced motion gets the final figure with no counting at all.
 */
function HeroMetric({
  metric,
  start,
  delay,
}: {
  metric: (typeof impactMetrics)[number];
  start: boolean;
  delay: number;
}) {
  const icon = METRIC_ICONS[metric.id];
  const value = useCountUp(metric.value, start, delay);

  return (
    <>
      <dt className="flex items-center gap-2 text-[0.68rem] uppercase leading-tight tracking-[0.1em] text-[var(--text-muted)]">
        {icon ? (
          <Icon name={icon} size={18} className="shrink-0 text-[var(--accent-secondary)]" />
        ) : null}
        <span className="min-w-0">{metric.label}</span>
      </dt>
      <dd className="mt-2 font-display text-[1.85rem] leading-none text-[var(--text-primary)]">
        {metric.prefix}
        <span data-testid={`hero-metric-${metric.id}`}>{value}</span>
        <span className="text-[var(--accent-primary)]">{metric.suffix}</span>
      </dd>
    </>
  );
}
