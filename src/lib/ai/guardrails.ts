/**
 * Guardrails.
 *
 * Everything a visitor sends is untrusted input. This module is the only place
 * that decides whether a message is safe to process, and the only place that
 * decides whether a generated answer is safe to return. Both directions are
 * checked, because a model can be talked into leaking through its output even
 * when the input looked ordinary.
 */

export const MAX_MESSAGE_LENGTH = 800;
export const MAX_HISTORY_TURNS = 8;

export interface SanitizeResult {
  ok: boolean;
  value: string;
  reason?: string;
}

/**
 * Normalises and length-limits a visitor message. Control characters and
 * zero-width characters are stripped: they are never meaningful in a question
 * and are a classic way to smuggle instructions past a naive filter.
 */
export function sanitizeMessage(input: unknown): SanitizeResult {
  if (typeof input !== 'string') {
    return { ok: false, value: '', reason: 'Message must be a string.' };
  }

  const cleaned = input
    .normalize('NFKC')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    // Zero-width, bidi-override and BOM characters are removed: a classic
    // way to hide instructions inside otherwise innocent-looking text.
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length === 0) {
    return { ok: false, value: '', reason: 'Message is empty.' };
  }
  if (cleaned.length > MAX_MESSAGE_LENGTH) {
    return {
      ok: false,
      value: '',
      reason: `Message is too long. Please keep it under ${MAX_MESSAGE_LENGTH} characters.`,
    };
  }

  return { ok: true, value: cleaned };
}

/**
 * Prompt-injection and exfiltration patterns.
 *
 * These are deliberately narrow. A blunt filter that rejects the word
 * "instructions" would also reject "what instructions did the business give
 * him?", which is a legitimate question. Each pattern targets an actual attack
 * shape: overriding the system prompt, extracting it, escaping the persona, or
 * pulling credentials and infrastructure detail.
 */
const INJECTION_PATTERNS: readonly RegExp[] = [
  /ignore\s+(all\s+|any\s+|your\s+|the\s+)*(previous|prior|above|earlier|preceding)\s+(instruction|prompt|rule|direction|message)/i,
  /disregard\s+(all\s+|any\s+|your\s+|the\s+)*(previous|prior|above|earlier|system)\s+(instruction|prompt|rule|direction)/i,
  /forget\s+(everything|all|your)\s+(you|instructions|rules|prompt)/i,
  /(reveal|show|print|output|repeat|display|expose|leak|dump)\s+(me\s+)?(your|the|all)?\s*(system|initial|original|hidden|secret|internal)\s*(prompt|instruction|message|rule|context)/i,
  /what\s+(is|are|was|were)\s+(your|the)\s+(system|initial|original|hidden|secret|internal)\s+(prompt|instruction|rule)/i,
  /repeat\s+(everything|all\s+text|the\s+text)\s+(above|before)/i,
  // "act as ..." is deliberately NOT here: "act as a technical reviewer and
  // summarise his stack" is a normal request. Persona *replacement* is the
  // attack, and these three phrases are what it actually looks like.
  /(you\s+are\s+now|from\s+now\s+on[, ]+you\s+(are|will be)|pretend\s+(to\s+be|you\s+are)|roleplay\s+as)/i,
  /\b(dan\s+mode|developer\s+mode|jailbreak|do\s+anything\s+now)\b/i,
  /(api[_\s-]?key|secret[_\s-]?key|access[_\s-]?token|bearer\s+token|env(ironment)?\s+variable|\.env\b|process\.env)/i,
  /(database|db)\s+(credential|password|connection\s+string)/i,
  /\b(curl|wget|fetch)\s+https?:\/\//i,
  /<\s*(script|iframe|object|embed)\b/i,
  /\b(system|assistant)\s*:\s*you\s+(must|should|will)/i,
  /```[\s\S]*?(ignore|system\s+prompt)[\s\S]*?```/i,
];

export interface InjectionCheck {
  blocked: boolean;
  /** Non-specific category, safe to log. Never echoed to the visitor verbatim. */
  category?: 'instruction_override' | 'prompt_extraction' | 'secret_probe' | 'unsafe_content';
}

export function detectInjection(message: string): InjectionCheck {
  for (const [i, pattern] of INJECTION_PATTERNS.entries()) {
    if (!pattern.test(message)) continue;
    if (i <= 2) return { blocked: true, category: 'instruction_override' };
    if (i <= 5) return { blocked: true, category: 'prompt_extraction' };
    if (i <= 7) return { blocked: true, category: 'instruction_override' };
    if (i <= 9) return { blocked: true, category: 'secret_probe' };
    return { blocked: true, category: 'unsafe_content' };
  }
  return { blocked: false };
}

export const INJECTION_RESPONSE =
  "I'm the assistant for Arvind Gupta's portfolio, so I only answer questions about his professional background — his experience, projects, skills and how to reach him. I can't change those instructions or discuss how I'm built. Ask me about his automation work and I'll give you a straight answer.";

/**
 * Output validation. Even a well-behaved model should not be trusted blindly,
 * and the local fallback composer should not be trusted blindly either. If an
 * answer looks like it is leaking configuration, we replace it rather than
 * ship it.
 */
const OUTPUT_LEAK_PATTERNS: readonly RegExp[] = [
  /sk-[a-zA-Z0-9]{16,}/,
  /\bANTHROPIC_API_KEY\b|\bOPENAI_API_KEY\b/i,
  /process\.env\.[A-Z_]+/,
  /you are (an? )?(ai )?assistant (for|representing)/i,
  /\bsystem prompt\b/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];

export function validateOutput(answer: string): { ok: boolean; answer: string } {
  const trimmed = answer.trim();
  if (trimmed.length === 0) {
    return {
      ok: false,
      answer:
        "I couldn't put together an answer for that one. Try asking about Arvind's experience, a specific project, or a technology like SQL, Python or Power BI.",
    };
  }
  for (const pattern of OUTPUT_LEAK_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { ok: false, answer: INJECTION_RESPONSE };
    }
  }
  return { ok: true, answer: trimmed };
}
