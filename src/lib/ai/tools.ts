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
  allowedKinds: readonly KnowledgeKind[];
  maxResults: number;
}

export const tools = {
  searchProfile: {
    name: 'searchProfile',
    purpose: 'Overall professional summary, positioning and approach.',
    allowedKinds: ['profile', 'achievement'],
    maxResults: 4,
  },
  searchExperience: {
    name: 'searchExperience',
    purpose: 'Employment history, roles, responsibilities and tenure.',
    allowedKinds: ['experience', 'profile'],
    maxResults: 5,
  },
  searchProjects: {
    name: 'searchProjects',
    purpose: 'Delivered automation case studies and what they achieved.',
    allowedKinds: ['project'],
    maxResults: 4,
  },
  searchSkills: {
    name: 'searchSkills',
    purpose: 'Technologies, platforms and where they were actually applied.',
    allowedKinds: ['skill', 'project', 'experience'],
    maxResults: 5,
  },
  searchImpact: {
    name: 'searchImpact',
    purpose: 'Measured achievements and business outcomes.',
    allowedKinds: ['achievement', 'project', 'profile'],
    maxResults: 4,
  },
  searchDomain: {
    name: 'searchDomain',
    purpose: 'Banking, NBFC and retail lending domain knowledge.',
    allowedKinds: ['domain', 'experience', 'project'],
    maxResults: 4,
  },
  searchEducation: {
    name: 'searchEducation',
    purpose: 'Academic qualifications.',
    allowedKinds: ['education'],
    maxResults: 2,
  },
  getContact: {
    name: 'getContact',
    purpose: 'How to get in touch and how to obtain the resume.',
    allowedKinds: ['contact', 'profile'],
    maxResults: 2,
  },
  searchAll: {
    name: 'searchAll',
    purpose: 'Fallback search across the whole profile.',
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

  const results = retrieve(query, {
    limit: tool.maxResults,
    kinds: tool.allowedKinds,
  });

  // Defence in depth: enforce the permission boundary on the way out too, in
  // case retrieval options are ever changed independently of this contract.
  const allowed: readonly KnowledgeKind[] = tool.allowedKinds;
  return results.filter((result) => allowed.includes(result.chunk.kind));
}
