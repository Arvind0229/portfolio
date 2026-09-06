import { profile } from '@/data/profile';
import { tokenize } from '@/lib/ai/retrieval';
import type { AssistantMode, RetrievedChunk } from '@/types';

/**
 * Deterministic grounded composer.
 *
 * This is not a language model. It assembles an answer out of sentences that
 * already exist in the resume-derived knowledge base, selected by overlap with
 * the visitor's question and framed for the active mode.
 *
 * It exists for three reasons, in order of importance:
 *   1. Correctness floor — it cannot hallucinate, because it can only emit
 *      sentences that came from the source data.
 *   2. Availability — the assistant keeps working when no API key is
 *      configured, when the provider is down, or when a rate limit is hit
 *      upstream. A portfolio that says "AI unavailable" to a recruiter has
 *      failed at the only moment that mattered.
 *   3. Cost — most visitor questions are answered well without a paid call.
 */

const NOT_FOUND_PREFIX = "I don't see";

/**
 * How far below the best match a chunk may score and still be worth quoting.
 *
 * Retrieval returns a ranked list, not a set of equally good answers. Quoting
 * rank 2 and 3 when they scored a fraction of rank 1 pads a correct answer
 * with text about something else — which reads, to a visitor, as though the
 * padding were part of the answer.
 */
const RELEVANCE_FLOOR = 0.45;

export function composeGroundedAnswer(
  question: string,
  mode: AssistantMode,
  context: RetrievedChunk[],
): string {
  if (context.length === 0) {
    return notFoundAnswer(question);
  }

  const queryTerms = new Set(tokenize(question));
  const sentences: string[] = [];
  const seen = new Set<string>();

  const best = context[0]?.score ?? 0;
  const relevant = context.filter((item) => item.score >= best * RELEVANCE_FLOOR);

  for (const item of relevant.slice(0, 3)) {
    for (const sentence of pickSentences(item, queryTerms, mode)) {
      const key = sentence.toLowerCase().slice(0, 60);
      if (seen.has(key)) continue;
      seen.add(key);
      sentences.push(sentence);
      if (sentences.length >= 5) break;
    }
    if (sentences.length >= 5) break;
  }

  if (sentences.length === 0) {
    return notFoundAnswer(question);
  }

  return sentences.join(' ');
}

/**
 * The answer for a question about something the profile does not contain.
 *
 * `named` carries entity names lifted from the question ("Kubernetes"), so the
 * refusal is specific rather than generic. Nothing from retrieval is appended:
 * a question whose subject is absent has no relevant evidence to quote, and
 * quoting adjacent text would imply experience that is not there.
 */
export function notFoundAnswer(question: string, named: string[] = []): string {
  const subject = named.length > 0 ? formatNames(named) : describeSubject(question);
  return `${NOT_FOUND_PREFIX} ${subject} in Arvind's profile, so I can't claim any experience there. What his resume does cover is RPA delivery with TruBot and Automation Edge, SQL/PL-SQL across Oracle, MS SQL, MySQL, PostgreSQL and Redshift, Python automation, Power BI and MIS reporting, and SMS/WhatsApp API integration in banking and retail lending. Ask me about any of those and I'll give you the detail.`;
}

function formatNames(names: string[]): string {
  if (names.length === 1) return names[0] as string;
  return `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`;
}

function describeSubject(question: string): string {
  const terms = tokenize(question).filter((t) => t.length > 2);
  const candidate = terms.slice(0, 3).join(' ');
  return candidate.length > 0 ? `anything about "${candidate}"` : 'that';
}

/**
 * Sentence selection. Sentences that overlap the question win; the mode then
 * biases towards the framing the visitor asked for (plain-language "In plain
 * language:" lines for business, "Technically:" lines for technical, impact
 * and role lines for recruiters).
 */
function pickSentences(
  item: RetrievedChunk,
  queryTerms: Set<string>,
  mode: AssistantMode,
): string[] {
  const raw = item.chunk.text
    .split(/(?<=[.!?])\s+(?=[A-Z“"'(])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);

  if (raw.length === 0) return [item.chunk.text.trim()];

  const scored = raw.map((sentence, index) => {
    const terms = tokenize(sentence);
    let overlap = 0;
    for (const term of terms) {
      if (queryTerms.has(term)) overlap += 1;
    }
    let score = overlap * 2 - index * 0.25;
    score += modeBias(sentence, mode);
    return { sentence, score, index };
  });

  const limit = mode === 'business' ? 2 : 3;

  return scored
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .sort((a, b) => a.index - b.index)
    .map((entry) => normaliseSentence(entry.sentence));
}

function modeBias(sentence: string, mode: AssistantMode): number {
  const lower = sentence.toLowerCase();
  switch (mode) {
    case 'business':
      if (lower.startsWith('in plain language')) return 4;
      if (lower.startsWith('impact:') || lower.startsWith('problem:')) return 2.5;
      if (lower.startsWith('technically:') || lower.startsWith('technologies:')) return -3;
      return 0;
    case 'technical':
      if (lower.startsWith('technically:')) return 4;
      if (lower.startsWith('technologies:') || lower.startsWith('solution:')) return 2.5;
      if (lower.startsWith('in plain language')) return -3;
      return 0;
    case 'recruiter':
      if (lower.startsWith('his role:') || lower.startsWith('impact:')) return 3;
      if (lower.includes('delivered') || lower.includes('owned')) return 1.5;
      if (lower.startsWith('how it was delivered')) return -1;
      return 0;
    default:
      return 0;
  }
}

function normaliseSentence(sentence: string): string {
  return sentence
    .replace(/^In plain language:\s*/i, '')
    .replace(/^Technically:\s*/i, '')
    .replace(/^His role:\s*/i, 'His role: ')
    .trim();
}

/** Short, factual greeting used before the visitor has asked anything real. */
export function greetingAnswer(): string {
  return `I'm the assistant for ${profile.name}'s portfolio. Ask me about his automation work, the technologies he uses, a specific project, or how to get in touch — I answer only from what's in his resume.`;
}
