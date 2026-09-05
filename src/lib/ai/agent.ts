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
  const caveat =
    unknown.length > 0
      ? `I don't see ${formatList(unknown)} anywhere in Arvind's profile, so I can't claim experience there. `
      : '';
  let answer = caveat + composeGroundedAnswer(message, input.mode, retrieved);
  let providerId = 'local';

  if (provider) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS);
      try {
        const result = await provider.generate({
          systemPrompt: buildSystemPrompt(input.mode, retrieved, unknown),
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

function buildRetrievalQuery(message: string, history: ChatMessage[]): string {
  const isFollowUp = /\b(those|these|that|it|them|which of|any of|the same|more about)\b/i.test(
    message,
  );
  if (!isFollowUp) return message;
  const lastUserTurn = [...history].reverse().find((m) => m.role === 'user');
  return lastUserTurn ? `${lastUserTurn.content} ${message}` : message;
}

function formatList(values: string[]): string {
  if (values.length === 1) return values[0] as string;
  return `${values.slice(0, -1).join(', ')} or ${values[values.length - 1]}`;
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
