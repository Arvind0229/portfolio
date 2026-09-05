import { NextResponse } from 'next/server';
import { knowledgeBase } from '@/lib/ai/knowledge';
import { resolveProvider } from '@/lib/ai/providers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Health check for load balancers and container orchestrators.
 * Reports readiness only — no versions, no configuration, no secrets.
 */
export function GET(): NextResponse {
  const provider = resolveProvider();
  return NextResponse.json(
    {
      status: 'ok',
      knowledgeChunks: knowledgeBase.length,
      // Whether an LLM is wired up is operationally useful and not sensitive;
      // which key, model or account is in use is neither reported nor implied.
      assistant: provider ? 'llm-enabled' : 'grounded-retrieval',
      timestamp: new Date().toISOString(),
    },
    { status: 200, headers: { 'cache-control': 'no-store' } },
  );
}
