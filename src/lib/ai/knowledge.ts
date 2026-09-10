import { achievements, architectureFlows, expertisePillars, impactMetrics, impactNarrative } from '@/data/impact';
import { experience } from '@/data/experience';
import { domainKnowledge, education, profile } from '@/data/profile';
import { projects } from '@/data/projects';
import { skillGroups } from '@/data/skills';
import type { KnowledgeChunk } from '@/types';

/**
 * The knowledge layer.
 *
 * Design decision: no vector database, no embedding service, no external
 * index. The corpus is a single resume — roughly 40 chunks and a few thousand
 * words. A lexical retriever over that corpus is faster, free, deterministic,
 * testable, offline-capable and impossible to poison. Adding pgvector or a
 * hosted vector store here would be infrastructure for its own sake.
 *
 * The interface below is deliberately retrieval-agnostic, so swapping in an
 * embedding index later is a change to `retrieval.ts` alone.
 */

/**
 * Words from a free-form question, usable as retrieval keywords.
 *
 * Deliberately not `tokenize` from retrieval.ts: that module imports this one,
 * and reaching back the other way would make the cycle real rather than
 * merely awkward. The rule here is looser too — keywords are hints, so a
 * short stop-word list is enough and the strictness belongs in the retriever.
 */
function tokenizeForKeywords(input: string): string[] {
  const skip = new Set([
    'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'is', 'are', 'was',
    'were', 'do', 'does', 'did', 'how', 'what', 'why', 'when', 'who', 'it', 'this',
    'that', 'you', 'your', 'he', 'his', 'him',
  ]);
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !skip.has(word));
}

function chunk(
  id: string,
  kind: KnowledgeChunk['kind'],
  title: string,
  text: string,
  keywords: string[],
  sourceSection: string,
  projectId?: string,
): KnowledgeChunk {
  return projectId
    ? { id, kind, title, text, keywords, sourceSection, projectId }
    : { id, kind, title, text, keywords, sourceSection };
}

function buildChunks(): KnowledgeChunk[] {
  const chunks: KnowledgeChunk[] = [];

  /* ---------------------------------------------------------------- */
  /* Profile                                                           */
  /* ---------------------------------------------------------------- */
  chunks.push(
    chunk(
      'profile-summary',
      'profile',
      'Professional summary',
      // summaryThirdPerson already opens with his name and title; repeating
      // them here produced "Arvind Gupta is an RPA Developer... Arvind is an
      // RPA Developer with 2.9 years..." in composed answers.
      `${profile.summaryThirdPerson} He is based in ${profile.location}.`,
      [
        'about',
        'who',
        'summary',
        'overview',
        'introduction',
        'background',
        'profile',
        'specialise',
        'specialize',
        'experience',
        'years',
        'rpa developer',
        'arvind',
      ],
      'Professional Summary',
    ),
  );

  chunks.push(
    chunk(
      'profile-positioning',
      'profile',
      'What he does',
      `${profile.positioningThirdPerson} Current focus areas: ${profile.focusAreas.join(', ')}. ${profile.availability}.`,
      ['focus', 'strength', 'strengths', 'specialisation', 'specialization', 'do', 'role', 'looking for', 'open to'],
      'Professional Summary',
    ),
  );

  /* ---------------------------------------------------------------- */
  /* Experience                                                        */
  /* ---------------------------------------------------------------- */
  for (const item of experience) {
    chunks.push(
      chunk(
        `experience-${item.id}`,
        'experience',
        `${item.role} at ${item.company}`,
        `${item.role} at ${item.company}, ${item.location} (${item.period}). ${item.summary} Technologies used: ${item.technologies.join(', ')}.`,
        [
          item.company.toLowerCase(),
          item.role.toLowerCase(),
          'employment',
          'job',
          'work',
          'career',
          'current',
          ...item.technologies.map((t) => t.toLowerCase()),
        ],
        'Professional Experience',
      ),
    );

    item.highlights.forEach((highlight, index) => {
      chunks.push(
        chunk(
          `experience-${item.id}-highlight-${index}`,
          'experience',
          `${item.company} — responsibility ${index + 1}`,
          highlight,
          [item.company.toLowerCase(), item.role.toLowerCase(), 'responsibility', 'did', 'work'],
          'Professional Experience',
        ),
      );
    });
  }

  /* ---------------------------------------------------------------- */
  /* Projects                                                          */
  /* ---------------------------------------------------------------- */
  /*
   * One chunk per *facet*, not one per project.
   *
   * The original shape put a project's whole story into a single chunk. That is
   * right for "tell me about the compliance bot" and wrong for everything
   * narrower: "what was the hardest part", "how often does it run", "who else
   * worked on it" all retrieved the same paragraph, and the answer buried the
   * one sentence the visitor actually asked for.
   *
   * Splitting has a cost that has to be managed rather than ignored. Retrieval
   * returns the top 5 chunks, so ten facets of one project can crowd out the
   * other four projects on a broad question like "what has he built". The fix
   * is in the keywords, not the scoring: **only the overview chunk carries the
   * generic project vocabulary** ('project', 'case study', 'built'). Facet
   * chunks carry the vocabulary of their own facet — 'volume', 'how often',
   * 'difficult', 'why', 'monitoring' — so a broad question lands on five
   * overviews and a narrow one lands on the facet that answers it.
   *
   * Facets appear only when Arvind has supplied them. There is deliberately no
   * fallback text for a missing facet: the agent's honest "that is not in the
   * profile" is the correct answer to a question the profile cannot answer, and
   * a generated stand-in would turn a gap into a fabrication.
   */
  for (const project of projects) {
    const titleWords = project.title.toLowerCase().split(/\s+/);
    const tech = project.technologies.map((t) => t.toLowerCase());

    /** Every facet needs the project's own name, or it can never be found. */
    const identity = [...titleWords, project.category.toLowerCase(), project.id.replace(/-/g, ' ')];

    chunks.push(
      chunk(
        `project-${project.id}`,
        'project',
        project.title,
        [
          `Project: ${project.title} (${project.category}).`,
          `In plain language: ${project.businessView}`,
          `Technically: ${project.technicalView}`,
          `Problem: ${project.problem}`,
          `Solution: ${project.solution}`,
          `Technologies: ${project.technologies.join(', ')}.`,
        ].join(' '),
        ['project', 'projects', 'case study', 'built', 'automation', ...identity, ...tech],
        'Key Projects',
        project.id,
      ),
    );

    chunks.push(
      chunk(
        `project-${project.id}-delivery`,
        'project',
        `${project.title} — his role and how it was delivered`,
        [
          `On ${project.title}, his role: ${project.role}`,
          `How it was delivered: ${project.process.join('; ')}.`,
          project.depth?.team ? `Team: ${project.depth.team}` : '',
          project.depth?.timeline ? `Timeline: ${project.depth.timeline}` : '',
        ]
          .filter(Boolean)
          .join(' '),
        [
          'role', 'responsibility', 'own', 'owned', 'alone', 'solo', 'team', 'timeline',
          'long', 'duration', 'delivered', 'steps', 'lifecycle', 'brd', 'uat',
          ...identity,
        ],
        'Key Projects',
        project.id,
      ),
    );

    chunks.push(
      chunk(
        `project-${project.id}-impact`,
        'project',
        `${project.title} — what changed`,
        [
          `Impact of ${project.title}: ${project.impact.join('; ')}.`,
          project.depth?.before ? `Before it existed: ${project.depth.before}` : '',
          project.depth?.after ? `After: ${project.depth.after}` : '',
        ]
          .filter(Boolean)
          .join(' '),
        [
          'impact', 'result', 'results', 'outcome', 'benefit', 'saved', 'reduced',
          'before', 'after', 'changed', 'improvement', 'roi',
          ...identity,
        ],
        'Key Projects',
        project.id,
      ),
    );

    const depth = project.depth;
    if (!depth) continue;

    if (depth.scale?.length) {
      chunks.push(
        chunk(
          `project-${project.id}-scale`,
          'project',
          `${project.title} — scale and frequency`,
          `Scale of ${project.title}: ${depth.scale.join('; ')}.`,
          [
            'scale', 'volume', 'volumes', 'records', 'transactions', 'many', 'often',
            'frequency', 'daily', 'hourly', 'schedule', 'users', 'branches', 'size',
            ...identity,
          ],
          'Key Projects',
          project.id,
        ),
      );
    }

    if (depth.systems?.length) {
      chunks.push(
        chunk(
          `project-${project.id}-systems`,
          'project',
          `${project.title} — systems it works against`,
          `${project.title} integrates with: ${depth.systems.join('; ')}.`,
          [
            'system', 'systems', 'application', 'applications', 'integration', 'integrates',
            'connects', 'interface', 'source', 'sources', 'database', 'databases',
            ...identity, ...tech,
          ],
          'Key Projects',
          project.id,
        ),
      );
    }

    depth.challenges?.forEach((item, index) => {
      chunks.push(
        chunk(
          `project-${project.id}-challenge-${index}`,
          'project',
          `${project.title} — challenge: ${item.challenge.slice(0, 60)}`,
          `A difficulty on ${project.title}: ${item.challenge} How he resolved it: ${item.resolution}`,
          [
            'challenge', 'challenges', 'difficult', 'hardest', 'hard', 'problem', 'issue',
            'blocker', 'struggle', 'tricky', 'obstacle', 'solved', 'resolved', 'fix',
            ...identity,
          ],
          'Key Projects',
          project.id,
        ),
      );
    });

    depth.decisions?.forEach((item, index) => {
      chunks.push(
        chunk(
          `project-${project.id}-decision-${index}`,
          'project',
          `${project.title} — decision: ${item.decision.slice(0, 60)}`,
          [
            `A decision he made on ${project.title}: ${item.decision}`,
            `Why: ${item.why}`,
            item.alternatives ? `Alternatives considered: ${item.alternatives}` : '',
          ]
            .filter(Boolean)
            .join(' '),
          [
            'decision', 'decisions', 'chose', 'choice', 'why', 'approach', 'instead',
            'alternative', 'alternatives', 'tradeoff', 'trade-off', 'considered',
            'design', 'reason', 'rationale',
            ...identity,
          ],
          'Key Projects',
          project.id,
        ),
      );
    });

    if (depth.failureHandling) {
      chunks.push(
        chunk(
          `project-${project.id}-operations`,
          'project',
          `${project.title} — what happens when it fails`,
          `Failure handling on ${project.title}: ${depth.failureHandling}`,
          [
            'fail', 'fails', 'failure', 'error', 'errors', 'break', 'breaks', 'broken',
            'exception', 'monitoring', 'monitor', 'alert', 'support', 'production',
            'downtime', 'retry', 'recovery', 'reliability', 'happens',
            ...identity,
          ],
          'Key Projects',
          project.id,
        ),
      );
    }

    depth.faq?.forEach((item, index) => {
      chunks.push(
        chunk(
          `project-${project.id}-faq-${index}`,
          'project',
          `${project.title} — ${item.question}`,
          `${item.question} ${item.answer}`,
          // The question itself is the keyword source. Anything he was asked
          // in his own words is likely to be asked again in similar words.
          [...tokenizeForKeywords(item.question), ...identity],
          'Key Projects',
          project.id,
        ),
      );
    });
  }

  /* ---------------------------------------------------------------- */
  /* Skills                                                            */
  /* ---------------------------------------------------------------- */
  for (const group of skillGroups) {
    chunks.push(
      chunk(
        `skill-${group.id}`,
        'skill',
        group.name,
        `${group.name}: ${group.skills.join(', ')}. ${group.description}`,
        [
          'skill',
          'skills',
          'technology',
          'technologies',
          'stack',
          'tools',
          'know',
          'use',
          ...group.name.toLowerCase().split(/\s+/),
          ...group.skills.map((s) => s.toLowerCase()),
        ],
        'Technical Skills',
      ),
    );
  }

  /* ---------------------------------------------------------------- */
  /* Achievements, impact and expertise                                */
  /* ---------------------------------------------------------------- */
  chunks.push(
    chunk(
      'achievements',
      'achievement',
      'Key achievements',
      `${achievements.join(' ')} ${impactNarrative} Measured impact: ${impactMetrics
        .map((m) => `${m.prefix}${m.value}${m.suffix} ${m.label.toLowerCase()} (${m.detail})`)
        .join('; ')}.`,
      [
        'achievement',
        'achievements',
        'impact',
        'results',
        'metrics',
        'numbers',
        'saved',
        'reduced',
        'effort',
        'hours',
        'value',
        'outcome',
        'mentor',
        'interns',
      ],
      'Key Achievements',
    ),
  );

  for (const pillar of expertisePillars) {
    chunks.push(
      chunk(
        `expertise-${pillar.id}`,
        'profile',
        pillar.title,
        // The pillar description is page copy written in Arvind's voice
        // ("I run the whole cycle"). The title and points carry the same
        // substance without the pronoun, so the assistant quotes those.
        `${pillar.title}. Specifically: ${pillar.points.join('; ')}.`,
        ['expertise', 'approach', 'how he works', 'strength', ...pillar.title.toLowerCase().split(/\s+/)],
        'Expertise',
      ),
    );
  }

  /* ---------------------------------------------------------------- */
  /* Architecture                                                      */
  /* ---------------------------------------------------------------- */
  for (const flow of architectureFlows) {
    chunks.push(
      chunk(
        `architecture-${flow.id}`,
        'profile',
        `Architecture — ${flow.name}`,
        `${flow.name}: ${flow.caption} Steps: ${flow.steps
          .map((step) => `${step.label} — ${step.detail}`)
          .join(' → ')}.`,
        ['architecture', 'design', 'flow', 'pipeline', 'lifecycle', 'process', 'how', 'framework'],
        'Architecture',
      ),
    );
  }

  /* ---------------------------------------------------------------- */
  /* Domain, education, contact                                        */
  /* ---------------------------------------------------------------- */
  chunks.push(
    chunk(
      'domain-knowledge',
      'domain',
      'Banking & lending domain knowledge',
      `Banking and lending domain knowledge covers: ${domainKnowledge.join(', ')}.`,
      [
        'domain',
        'banking',
        'lending',
        'nbfc',
        'finance',
        'loan',
        'loans',
        'kyc',
        'compliance',
        'collections',
        'npa',
        'los',
        'lms',
        'mortgage',
        'gold loan',
        'lap',
      ],
      'Banking & Lending Domain Knowledge',
    ),
  );

  chunks.push(
    chunk(
      'education',
      'education',
      'Education',
      education.map((e) => `${e.qualification} — ${e.institution} (${e.period})`).join('. ') + '.',
      ['education', 'degree', 'college', 'university', 'qualification', 'study', 'studied', 'graduate'],
      'Education',
    ),
  );

  chunks.push(
    chunk(
      'contact',
      'contact',
      'Contact details',
      `Email: ${profile.email}. Phone: ${profile.phone}. Location: ${profile.location}. A downloadable resume is available from the Resume section of this site.`,
      ['contact', 'email', 'phone', 'reach', 'hire', 'call', 'mail', 'resume', 'cv', 'download', 'get in touch'],
      'Contact',
    ),
  );

  return chunks;
}

/** Built once per process and reused; the corpus is immutable at runtime. */
export const knowledgeBase: readonly KnowledgeChunk[] = buildChunks();

export function getChunkById(id: string): KnowledgeChunk | undefined {
  return knowledgeBase.find((c) => c.id === id);
}
