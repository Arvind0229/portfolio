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

function chunk(
  id: string,
  kind: KnowledgeChunk['kind'],
  title: string,
  text: string,
  keywords: string[],
  sourceSection: string,
): KnowledgeChunk {
  return { id, kind, title, text, keywords, sourceSection };
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
      // RPA Developer with 2+ years..." in composed answers.
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
  for (const project of projects) {
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
          `His role: ${project.role}`,
          `How it was delivered: ${project.process.join('; ')}.`,
          `Impact: ${project.impact.join('; ')}.`,
          `Technologies: ${project.technologies.join(', ')}.`,
        ].join(' '),
        [
          'project',
          'case study',
          'built',
          'automation',
          project.category.toLowerCase(),
          ...project.title.toLowerCase().split(/\s+/),
          ...project.technologies.map((t) => t.toLowerCase()),
        ],
        'Key Projects',
      ),
    );
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
