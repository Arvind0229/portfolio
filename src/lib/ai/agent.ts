import { suggestedQuestions } from '@/data/site';
import { detectIntent } from '@/lib/ai/intent';
import {
  INJECTION_RESPONSE,
  detectInjection,
  sanitizeMessage,
  validateOutput,
} from '@/lib/ai/guardrails';
import { composeGroundedAnswer, greetingAnswer, notFoundAnswer } from '@/lib/ai/providers/local';
import { resolveProvider } from '@/lib/ai/providers';
import { buildSystemPrompt } from '@/lib/ai/prompt';
import { runTool } from '@/lib/ai/tools';
import { unknownEntities } from '@/lib/ai/retrieval';
import type { AssistantMode, AssistantSource, ChatMessage, RetrievedChunk } from '@/types';

/**
 * Agent orchestrator.
 *
 *   sanitize -> injection check -> intent -> tool selection -> retrieval ->
 *   grounded context -> generation (LLM or deterministic) -> output validation
 *
 * The retrieval step is not optional. Even when an LLM is configured, it only
 * ever sees resume-derived context and is instructed to refuse anything the
 * context does not support. When retrieval finds nothing, the agent answers
 * "not in his profile" without calling the model at all — which is both the
 * honest answer and the cheap one.
 */

const GENERATION_TIMEOUT_MS = 12_000;
const MAX_OUTPUT_TOKENS = 400;

export interface AgentInput {
  message: unknown;
  mode: AssistantMode;
  history: ChatMessage[];
}

export interface AgentOutcome {
  answer: string;
  sources: AssistantSource[];
  toolUsed: string;
  grounded: boolean;
  suggestions: string[];
  /** Set when the request should not be processed at all. */
  rejection?: { reason: string };
  /** Non-sensitive diagnostics for structured server logs. */
  diagnostics: {
    intent: string;
    provider: string;
    retrievedCount: number;
    blocked: boolean;
    blockCategory?: string;
  };
}

const GREETING_PATTERN = /^(hi|hello|hey|yo|good (morning|afternoon|evening)|namaste)\b[\s!.]*$/i;

export async function runAgent(input: AgentInput): Promise<AgentOutcome> {
  /* 1. Sanitize ---------------------------------------------------- */
  const sanitized = sanitizeMessage(input.message);
  if (!sanitized.ok) {
    return {
      answer: '',
      sources: [],
      toolUsed: 'none',
      grounded: false,
      suggestions: [],
      rejection: { reason: sanitized.reason ?? 'Invalid message.' },
      diagnostics: { intent: 'invalid', provider: 'none', retrievedCount: 0, blocked: false },
    };
  }

  const message = sanitized.value;

  /* 2. Injection defence ------------------------------------------- */
  const injection = detectInjection(message);
  if (injection.blocked) {
    return {
      answer: INJECTION_RESPONSE,
      sources: [],
      toolUsed: 'none',
      grounded: true,
      suggestions: pickSuggestions(input.mode),
      diagnostics: {
        intent: 'blocked',
        provider: 'guardrail',
        retrievedCount: 0,
        blocked: true,
        ...(injection.category ? { blockCategory: injection.category } : {}),
      },
    };
  }

  /* 3. Greetings need no retrieval and no model call ---------------- */
  if (GREETING_PATTERN.test(message)) {
    return {
      answer: greetingAnswer(),
      sources: [],
      toolUsed: 'none',
      grounded: true,
      suggestions: pickSuggestions(input.mode),
      diagnostics: { intent: 'greeting', provider: 'local', retrievedCount: 0, blocked: false },
    };
  }

  /* 4. Intent -> tool ----------------------------------------------- */
  const intent = detectIntent(message);

  /* 5. Retrieval ---------------------------------------------------- */
  // Follow-ups such as "which of those used Python?" are resolved by adding the
  // previous question to the retrieval query only — never to the answer.
  const retrievalQuery = buildRetrievalQuery(message, input.history);
  let retrieved = runTool(intent.tool, retrievalQuery);

  // If a narrow tool found nothing, widen once before giving up. This is a
  // recovery step, not a habit of calling every tool available.
  if (retrieved.length === 0 && intent.tool !== 'searchAll') {
    retrieved = runTool('searchAll', retrievalQuery);
  }

  // Named things the visitor asked about that appear nowhere in the profile.
  // Retrieval may still have found something adjacent ("triggers" when asked
  // about "Salesforce Apex triggers"), and answering that without the caveat
  // would imply experience he does not have.
  const unknown = unknownEntities(message);

  // A question whose subject is absent from the profile is answered by saying
  // so, and nothing else. Retrieval will still have matched on framing words
  // ("does he have EXPERIENCE with Kubernetes?"), and appending what those
  // matched reads as though an unrelated role were the answer.
  if (unknown.length > 0) {
    return {
      answer: notFoundAnswer(message, unknown),
      sources: [],
      toolUsed: intent.tool,
      grounded: true,
      suggestions: pickSuggestions(input.mode),
      diagnostics: {
        intent: intent.intent,
        provider: 'local',
        retrievedCount: 0,
        blocked: false,
      },
    };
  }

  const sources = toSources(retrieved);

  if (retrieved.length === 0) {
    return {
      answer: notFoundAnswer(message),
      sources: [],
      toolUsed: intent.tool,
      grounded: true,
      suggestions: pickSuggestions(input.mode),
      diagnostics: {
        intent: intent.intent,
        provider: 'local',
        retrievedCount: 0,
        blocked: false,
      },
    };
  }

  /* 6. Generation ---------------------------------------------------- */
  const provider = resolveProvider();
  let answer = composeGroundedAnswer(message, input.mode, retrieved);
  let providerId = 'local';

  if (provider) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS);
      try {
        const result = await provider.generate({
          systemPrompt: buildSystemPrompt(input.mode, retrieved),
          messages: [...trimHistory(input.history), { role: 'user', content: message }],
          maxTokens: MAX_OUTPUT_TOKENS,
          temperature: 0.2,
          signal: controller.signal,
        });
        answer = result.text;
        providerId = result.provider;
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      // The deterministic answer already computed above stands in. The visitor
      // sees a correct, grounded response rather than an error.
      console.warn('[ai] provider generation failed, using grounded fallback', {
        provider: provider.id,
        error: error instanceof Error ? error.name : 'unknown',
      });
      providerId = 'local-fallback';
    }
  }

  /* 7. Output validation --------------------------------------------- */
  const validated = validateOutput(answer);

  return {
    answer: validated.answer,
    sources,
    toolUsed: intent.tool,
    grounded: true,
    suggestions: pickSuggestions(input.mode),
    diagnostics: {
      intent: intent.intent,
      provider: providerId,
      retrievedCount: retrieved.length,
      blocked: !validated.ok,
    },
  };
}

/**
 * Phrases that describe WHO the answer is for, not WHAT it is about.
 *
 * "Summarise his experience for a recruiter" was retrieving his Talent
 * Acquisition role, because "recruiter" is a strong term in that chunk. The
 * audience is already carried by the mode selector, so these phrases are
 * stripped from the retrieval query — and from that query only. The model,
 * when one is configured, still receives the visitor's words verbatim.
 */
const AUDIENCE_FRAMING: readonly RegExp[] = [
  /\bfor (?:a |an |my )?(?:recruiter|hiring manager|hr|cto|cio|engineer|developer|technical (?:audience|reader)|business (?:audience|reader)|non-?technical (?:person|audience|reader))\b/gi,
  /\bas (?:a |an )(?:recruiter|hiring manager|engineer|developer|cto)\b/gi,
  /\bin (?:simple|plain|business|layman'?s?|non-?technical) (?:language|terms|english|words)\b/gi,
  /\bexplain (?:it|this) like i'?m five\b/gi,
  /\b(?:i'?m|i am) (?:hiring|recruiting) for\b/gi,
];

function stripAudienceFraming(message: string): string {
  let out = message;
  for (const pattern of AUDIENCE_FRAMING) out = out.replace(pattern, ' ');
  return out.replace(/\s+/g, ' ').trim() || message;
}

function buildRetrievalQuery(message: string, history: ChatMessage[]): string {
  const subject = stripAudienceFraming(message);

  const isFollowUp = /\b(those|these|that|it|them|which of|any of|the same|more about)\b/i.test(
    message,
  );
  if (!isFollowUp) return subject;

  const lastUserTurn = [...history].reverse().find((m) => m.role === 'user');
  return lastUserTurn
    ? `${stripAudienceFraming(lastUserTurn.content)} ${subject}`
    : subject;
}

function trimHistory(history: ChatMessage[]): ChatMessage[] {
  return history.slice(-6);
}

function toSources(retrieved: RetrievedChunk[]): AssistantSource[] {
  const seen = new Set<string>();
  const sources: AssistantSource[] = [];
  for (const item of retrieved.slice(0, 3)) {
    const key = `${item.chunk.sourceSection}:${item.chunk.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    sources.push({
      id: item.chunk.id,
      title: item.chunk.title,
      section: item.chunk.sourceSection,
    });
  }
  return sources;
}

function pickSuggestions(mode: AssistantMode): string[] {
  return [...(suggestedQuestions[mode] ?? suggestedQuestions.general ?? [])].slice(0, 3);
}
