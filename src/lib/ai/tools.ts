import { retrieve } from '@/lib/ai/retrieval';
import type { KnowledgeKind, RetrievedChunk } from '@/types';

/**
 * Tool registry.
 *
 * Each tool is a narrow, read-only view over the resume knowledge base. There
 * is deliberately no tool that touches the filesystem, the network, the
 * environment, or any mutable state — the agent physically cannot do those
 * things, which is a stronger guarantee than telling a model not to.
 *
 * `allowedKinds` is the permission boundary: a tool can only ever surface
 * chunks of the kinds it declares.
 */
export interface ToolDefinition {
  name: string;
  purpose: string;
  /** Hard permission boundary — nothing outside these kinds can be surfaced. */
  allowedKinds: readonly KnowledgeKind[];
  /**
   * The kind this tool is actually about. Allowed-but-secondary kinds provide
   * supporting detail and are ranked below it.
   *
   * Without this, "what are his strongest TECHNICAL skills?" surfaced a
   * recruitment responsibility — "technical and non-technical roles" is a
   * short chunk with a high term frequency for "technical", so BM25 ranked it
   * above the skills groups. Filtering alone could not fix that; the tool's
   * intent has to reach the ranking.
   */
  primaryKinds: readonly KnowledgeKind[];
  maxResults: number;
}

/** How much a primary-kind chunk outranks an equally-scoring secondary one. */
const PRIMARY_KIND_BOOST = 1.45;

export const tools = {
  searchProfile: {
    name: 'searchProfile',
    purpose: 'Overall professional summary, positioning and approach.',
    primaryKinds: ['profile'],
    allowedKinds: ['profile', 'achievement'],
    maxResults: 4,
  },
  searchExperience: {
    name: 'searchExperience',
    purpose: 'Employment history, roles, responsibilities and tenure.',
    // The career summary answers "summarise his experience" at least as well
    // as the individual roles do, so both rank ahead of supporting detail.
    primaryKinds: ['experience', 'profile'],
    allowedKinds: ['experience', 'profile'],
    maxResults: 5,
  },
  searchProjects: {
    name: 'searchProjects',
    purpose: 'Delivered automation case studies and what they achieved.',
    primaryKinds: ['project'],
    allowedKinds: ['project'],
    maxResults: 4,
  },
  searchSkills: {
    name: 'searchSkills',
    purpose: 'Technologies, platforms and where they were actually applied.',
    primaryKinds: ['skill'],
    allowedKinds: ['skill', 'project', 'experience'],
    maxResults: 5,
  },
  searchImpact: {
    name: 'searchImpact',
    purpose: 'Measured achievements and business outcomes.',
    primaryKinds: ['achievement'],
    allowedKinds: ['achievement', 'project', 'profile'],
    maxResults: 4,
  },
  searchDomain: {
    name: 'searchDomain',
    purpose: 'Banking, NBFC and retail lending domain knowledge.',
    primaryKinds: ['domain'],
    allowedKinds: ['domain', 'experience', 'project'],
    maxResults: 4,
  },
  searchEducation: {
    name: 'searchEducation',
    purpose: 'Academic qualifications.',
    primaryKinds: ['education'],
    allowedKinds: ['education'],
    maxResults: 2,
  },
  getContact: {
    name: 'getContact',
    purpose: 'How to get in touch and how to obtain the resume.',
    primaryKinds: ['contact'],
    allowedKinds: ['contact', 'profile'],
    maxResults: 2,
  },
  searchAll: {
    name: 'searchAll',
    purpose: 'Fallback search across the whole profile.',
    // Deliberately unbiased: this runs when intent was ambiguous, so there is
    // no kind it should be pushing to the top.
    primaryKinds: [],
    allowedKinds: [
      'profile',
      'experience',
      'project',
      'skill',
      'achievement',
      'education',
      'domain',
      'contact',
    ],
    maxResults: 6,
  },
} as const satisfies Record<string, ToolDefinition>;

export type ToolName = keyof typeof tools;

/**
 * Executes a tool. Input is validated, output is bounded, and the tool can
 * only read chunk kinds it is permitted to read.
 */
export function runTool(name: ToolName, query: string): RetrievedChunk[] {
  const tool = tools[name];
  if (!tool) {
    // Unknown tool names never reach here through normal flow; failing closed
    // rather than falling back to an unrestricted search is the safe choice.
    return [];
  }
  if (typeof query !== 'string' || query.trim().length === 0) {
    return [];
  }

  // Over-fetch, re-rank with the tool's bias, then trim to the tool's limit.
  const results = retrieve(query, {
    limit: tool.maxResults * 3,
    kinds: tool.allowedKinds,
  });

  const primary: readonly KnowledgeKind[] = tool.primaryKinds;
  const ranked = results
    .map((result) => ({
      chunk: result.chunk,
      score: primary.includes(result.chunk.kind)
        ? result.score * PRIMARY_KIND_BOOST
        : result.score,
    }))
    .sort((a, b) => b.score - a.score || a.chunk.id.localeCompare(b.chunk.id))
    .slice(0, tool.maxResults);

  // Defence in depth: enforce the permission boundary on the way out too, in
  // case retrieval options are ever changed independently of this contract.
  const allowed: readonly KnowledgeKind[] = tool.allowedKinds;
  return ranked.filter((result) => allowed.includes(result.chunk.kind));
}
