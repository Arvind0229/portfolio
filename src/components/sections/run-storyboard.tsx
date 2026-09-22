import Link from 'next/link';
import { Icon, type IconName } from '@/components/icons';
import { publicDepthFor } from '@/data/project-depth';
import { projects } from '@/data/projects';

/**
 * One automation, run step by step, as the visitor scrolls.
 *
 * ## Why this exists
 *
 * Five case-study cards say *what* was built. None of them shows what a bot
 * actually does between the trigger and the mail landing in someone's inbox,
 * and that is the thing a recruiter or a hiring engineer is trying to picture.
 * This section takes one real workflow and plays it: the steps arrive in order
 * as the page moves, joined by a rail that fills as you read.
 *
 * ## Why this project, and why from the depth layer
 *
 * The steps are read from `project-depth.json`, the same record the case-study
 * page renders — not written a second time here. The manpower report is the
 * one project whose run Arvind has described step by step, so it is the one
 * shown. If that record is removed, made internal, or has no workflow, this
 * section renders nothing: an empty storyboard would be a stage set, and a
 * made-up one would be a claim he never made.
 *
 * ## Why no JavaScript
 *
 * Every effect here is CSS: `position: sticky` for the pinned column, and
 * `animation-timeline: view()` for the arrivals and the rail. Where a browser
 * does not support scroll-driven animation the rules sit inside `@supports`,
 * so what remains is the finished state — every step visible, the rail full.
 * Under reduced motion the classes are in the suppression list and land on the
 * same finished state.
 */

const STORY_PROJECT = 'hr-process-automation';

/**
 * An icon for a step, chosen from what the step says.
 *
 * Decoration only — the text carries the meaning, and a step that matches
 * nothing falls back to the gear. Kept deliberately small: the moment this
 * needs a rule per project, the icon belongs in the data instead.
 */
function iconFor(step: string): IconName {
  const text = step.toLowerCase();
  if (/(email|mail|distribut)/.test(text)) return 'mail';
  if (/(query|database|sql)/.test(text)) return 'database';
  if (/(excel|report)/.test(text)) return 'document';
  if (/(summary|region)/.test(text)) return 'chart';
  if (/(role|branch|employee)/.test(text)) return 'users';
  if (/(rule|filter|status)/.test(text)) return 'check';
  if (/(lookup|mapping|map)/.test(text)) return 'layers';
  if (/(source|obtain|download)/.test(text)) return 'bot';
  return 'gear';
}

export function RunStoryboard() {
  const project = projects.find((entry) => entry.id === STORY_PROJECT);
  const depth = publicDepthFor(STORY_PROJECT);
  const steps = depth?.workflow ?? [];
  if (!project || steps.length < 3) return null;

  return (
    <div className="storyboard mt-20 grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-14">
      <div className="storyboard-lead lg:sticky lg:top-28 lg:self-start">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-[var(--accent-primary)]">
          Inside one run
        </p>
        <h3 className="mt-3 text-[clamp(1.35rem,3vw,1.9rem)]">{project.title}</h3>
        <p className="mt-4 text-[0.95rem] leading-relaxed text-[var(--text-secondary)]">
          {project.businessView}
        </p>
        <p className="mt-4 text-[0.82rem] leading-relaxed text-[var(--text-muted)]">
          The steps are the ones this bot runs, in order, as he describes them. Described, not
          recorded — no real records, names or figures appear here.
        </p>
        <Link
          href={`/projects/${project.id}`}
          className="mt-6 inline-flex items-center gap-2 text-[0.9rem] font-medium text-[var(--accent-primary)] underline-offset-4 hover:underline"
        >
          Read the full case study
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      <div className="storyboard-panel surface-card relative p-5 sm:p-7">
        <span aria-hidden="true" className="storyboard-rail">
          <span className="storyboard-rail-fill" />
        </span>
        <ol className="relative space-y-3" aria-label={`${project.title}, step by step`}>
          {steps.map((step, index) => (
            <li key={step} className="story-step flex items-start gap-4">
              <span
                aria-hidden="true"
                className="story-step-mark relative z-[1] flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--icon-tint,var(--accent-primary))]"
              >
                <Icon name={iconFor(step)} size={16} />
              </span>
              <div className="min-w-0 pt-1.5">
                <span className="font-mono text-[0.68rem] tracking-[0.18em] text-[var(--text-muted)]">
                  STEP {String(index + 1).padStart(2, '0')}
                </span>
                <p className="mt-0.5 break-words text-[0.95rem] leading-snug">{step}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
