import { NextResponse } from 'next/server';
import { runAgent } from '@/lib/ai/agent';
import { assistantModes } from '@/data/site';
import {
  DEFAULT_RATE_LIMIT,
  clientKeyFromHeaders,
  createRateLimiter,
} from '@/lib/security/rate-limit';
import {
  createSessionId,
  getSessionStore,
  isValidSessionId,
} from '@/lib/session/store';
import type { AssistantErrorBody, AssistantMode, AssistantResponseBody } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Rejected before the body is read — no reason to parse an oversized payload. */
const MAX_BODY_BYTES = 4_096;

const limiter = createRateLimiter(DEFAULT_RATE_LIMIT);
const validModes = new Set<string>(assistantModes.map((mode) => mode.id));

function errorResponse(
  body: AssistantErrorBody,
  status: number,
  headers?: Record<string, string>,
): NextResponse<AssistantErrorBody> {
  return NextResponse.json(body, { status, headers });
}

export async function POST(request: Request): Promise<NextResponse<AssistantResponseBody | AssistantErrorBody>> {
  /* --- Request-level validation ------------------------------------ */
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return errorResponse(
      { ok: false, error: 'Expected application/json.', code: 'invalid_request' },
      415,
    );
  }

  const declaredLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return errorResponse(
      { ok: false, error: 'Request body is too large.', code: 'invalid_request' },
      413,
    );
  }

  /* --- Rate limiting ------------------------------------------------ */
  const clientKey = clientKeyFromHeaders(request.headers);
  const rate = limiter.check(clientKey);
  if (!rate.allowed) {
    return errorResponse(
      {
        ok: false,
        error:
          "That's a lot of questions in a short time. Give it a few seconds and ask again — or use the sections above in the meantime.",
        code: 'rate_limited',
        retryAfterSeconds: rate.retryAfterSeconds,
      },
      429,
      { 'retry-after': String(rate.retryAfterSeconds) },
    );
  }

  /* --- Body parsing -------------------------------------------------- */
  let payload: unknown;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return errorResponse(
        { ok: false, error: 'Request body is too large.', code: 'invalid_request' },
        413,
      );
    }
    payload = JSON.parse(raw);
  } catch {
    return errorResponse(
      { ok: false, error: 'Malformed JSON body.', code: 'invalid_request' },
      400,
    );
  }

  if (typeof payload !== 'object' || payload === null) {
    return errorResponse(
      { ok: false, error: 'Body must be a JSON object.', code: 'invalid_request' },
      400,
    );
  }

  const { message, mode: rawMode, sessionId: rawSessionId } = payload as Record<string, unknown>;

  const mode: AssistantMode =
    typeof rawMode === 'string' && validModes.has(rawMode)
      ? (rawMode as AssistantMode)
      : 'general';

  /* --- Session ------------------------------------------------------- */
  const store = getSessionStore();
  const sessionId = isValidSessionId(rawSessionId) ? rawSessionId : createSessionId();
  const history = store.getHistory(sessionId);

  /* --- Agent --------------------------------------------------------- */
  try {
    const outcome = await runAgent({ message, mode, history });

    if (outcome.rejection) {
      return errorResponse(
        { ok: false, error: outcome.rejection.reason, code: 'invalid_request' },
        400,
      );
    }

    // Structured, non-sensitive logging. The visitor's message is never logged.
    console.info('[ai]', {
      intent: outcome.diagnostics.intent,
      tool: outcome.toolUsed,
      provider: outcome.diagnostics.provider,
      retrieved: outcome.diagnostics.retrievedCount,
      blocked: outcome.diagnostics.blocked,
      ...(outcome.diagnostics.blockCategory
        ? { blockCategory: outcome.diagnostics.blockCategory }
        : {}),
    });

    if (typeof message === 'string' && !outcome.diagnostics.blocked) {
      store.append(sessionId, [
        { role: 'user', content: message.slice(0, 800) },
        { role: 'assistant', content: outcome.answer },
      ]);
    }

    const body: AssistantResponseBody = {
      ok: true,
      answer: outcome.answer,
      mode,
      sessionId,
      sources: outcome.sources,
      toolUsed: outcome.toolUsed,
      grounded: outcome.grounded,
      suggestions: outcome.suggestions,
    };

    return NextResponse.json(body, {
      status: 200,
      headers: {
        'cache-control': 'no-store',
        'x-ratelimit-remaining': String(rate.remaining),
      },
    });
  } catch (error) {
    // Nothing about the internal failure reaches the visitor.
    console.error('[ai] unhandled agent failure', {
      error: error instanceof Error ? error.name : 'unknown',
    });
    return errorResponse(
      {
        ok: false,
        error:
          "Something went wrong answering that. Please try again in a moment — the rest of the site still has everything you need.",
        code: 'server_error',
      },
      500,
    );
  }
}

export function GET(): NextResponse<AssistantErrorBody> {
  return errorResponse(
    { ok: false, error: 'Method not allowed.', code: 'invalid_request' },
    405,
    { allow: 'POST' },
  );
}
