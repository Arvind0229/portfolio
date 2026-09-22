import raw from '@/data/impact.json';
import type { ArchitectureFlow, ExpertisePillar, ImpactMetric } from '@/types';

/**
 * Impact figures, the expertise pillars and the architecture flows.
 *
 * Every number here must appear in the resume. Nothing is estimated,
 * extrapolated or rounded up. "Hundreds of operational hours a year" is a range
 * in the source document, so it is shown as text rather than as a fake precise
 * count.
 *
 * Since CHANGE-011 the content lives in `impact.json`, which the admin panel
 * edits (Impact tab). This module validates it. The validator follows the same
 * rule as every other content file: it never throws, it drops a malformed
 * entry, and it runs both when the site builds and when the admin saves. One
 * bad edit can therefore never take the page down.
 */

export interface ImpactContent {
  metrics: ImpactMetric[];
  narrative: string;
  achievements: string[];
  pillars: ExpertisePillar[];
  flows: ArchitectureFlow[];
}

type Rec = Record<string, unknown>;
const rec = (value: unknown): Rec =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Rec) : {};
const str = (value: unknown, max = 600): string =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const strings = (value: unknown, max = 300): string[] =>
  list(value)
    .map((entry) => str(entry, max))
    .filter(Boolean);

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

/** An id for every entry, unique in its list: kept if valid, else made from `fallback`. */
function ider() {
  const seen = new Set<string>();
  return (value: unknown, fallback: string): string => {
    const base = /^[a-z0-9-]{1,48}$/.test(str(value)) ? str(value) : slug(fallback) || 'item';
    let id = base;
    for (let n = 2; seen.has(id); n += 1) id = `${base}-${n}`;
    seen.add(id);
    return id;
  };
}

function parseMetric(value: unknown, id: ReturnType<typeof ider>): ImpactMetric | null {
  const r = rec(value);
  const label = str(r.label, 80);
  const number = typeof r.value === 'number' ? r.value : Number(r.value);
  if (!label || !Number.isFinite(number) || number < 0) return null;
  const outOf = typeof r.outOf === 'number' && r.outOf > 0 ? r.outOf : undefined;
  return {
    id: id(r.id, label),
    value: number,
    prefix: str(r.prefix, 4),
    suffix: str(r.suffix, 4),
    label,
    detail: str(r.detail, 240),
    ...(outOf ? { outOf } : {}),
  };
}

function parsePillar(value: unknown, id: ReturnType<typeof ider>): ExpertisePillar | null {
  const r = rec(value);
  const title = str(r.title, 120);
  if (!title) return null;
  return { id: id(r.id, title), title, description: str(r.description), points: strings(r.points) };
}

function parseFlow(value: unknown, id: ReturnType<typeof ider>): ArchitectureFlow | null {
  const r = rec(value);
  const name = str(r.name, 120);
  const stepId = ider();
  const steps = list(r.steps)
    .map((step) => {
      const s = rec(step);
      const label = str(s.label, 80);
      return label ? { id: stepId(s.id, label), label, detail: str(s.detail, 300) } : null;
    })
    .filter((step): step is NonNullable<typeof step> => step !== null);
  if (!name || steps.length === 0) return null;
  return { id: id(r.id, name), name, verified: r.verified === true, caption: str(r.caption), steps };
}

export function parseImpact(value: unknown): ImpactContent {
  const r = rec(value);
  const metricId = ider();
  const pillarId = ider();
  const flowId = ider();
  return {
    metrics: list(r.metrics)
      .map((m) => parseMetric(m, metricId))
      .filter((m): m is ImpactMetric => m !== null),
    narrative: str(r.narrative),
    achievements: strings(r.achievements),
    pillars: list(r.pillars)
      .map((p) => parsePillar(p, pillarId))
      .filter((p): p is ExpertisePillar => p !== null),
    flows: list(r.flows)
      .map((f) => parseFlow(f, flowId))
      .filter((f): f is ArchitectureFlow => f !== null),
  };
}

export const impact: ImpactContent = parseImpact(raw);

export const impactMetrics: readonly ImpactMetric[] = impact.metrics;
export const impactNarrative: string = impact.narrative;
export const achievements: readonly string[] = impact.achievements;
export const expertisePillars: readonly ExpertisePillar[] = impact.pillars;
/**
 * `verified: true` means the flow describes systems the resume states were
 * actually built. Anything conceptual is labelled "Illustrative" in the UI.
 */
export const architectureFlows: readonly ArchitectureFlow[] = impact.flows;
