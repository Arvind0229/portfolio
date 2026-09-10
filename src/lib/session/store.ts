import type { ChatMessage } from '@/types';

/**
 * Conversation session store.
 *
 * Follow-up questions ("which of those used Python?") need the previous turn,
 * so some state is required. Two options were considered:
 *
 *   A. Client sends the full history with each request.
 *      Stateless and horizontally scalable, but the history is then
 *      attacker-controlled: a crafted "assistant" turn is a free injection
 *      vector into the model context.
 *
 *   B. Server keeps a bounded, expiring history keyed by an opaque session id.
 *      The client can only ever append its own user turn; assistant turns are
 *      whatever the server actually produced.
 *
 * B was chosen — the injection surface matters more here than statelessness,
 * and the state is tiny. Like the rate limiter, the default implementation is
 * in-process: with multiple instances a visitor may land on an instance that
 * does not have their history, and the assistant simply answers without it.
 * That degrades gracefully. Swap `SessionStore` for Redis when it matters.
 *
 * No personal data is stored — only the visitor's own questions, the answers
 * given, and a timestamp. Sessions expire, and nothing is persisted to disk.
 */

export const MAX_TURNS = 8;
export const SESSION_TTL_MS = 30 * 60 * 1000;
const MAX_SESSIONS = 2_000;

interface SessionRecord {
  messages: ChatMessage[];
  updatedAt: number;
}

export interface SessionStore {
  getHistory(sessionId: string): ChatMessage[];
  append(sessionId: string, messages: ChatMessage[]): void;
  clear(sessionId: string): void;
  size(): number;
}

export function createMemorySessionStore(ttlMs: number = SESSION_TTL_MS): SessionStore {
  const sessions = new Map<string, SessionRecord>();

  function evictExpired(now: number): void {
    for (const [id, record] of sessions) {
      if (now - record.updatedAt > ttlMs) sessions.delete(id);
    }
    if (sessions.size <= MAX_SESSIONS) return;
    // Oldest-first eviction keeps memory bounded if traffic outruns the TTL.
    const ordered = Array.from(sessions.entries()).sort(
      (a, b) => a[1].updatedAt - b[1].updatedAt,
    );
    for (const [id] of ordered) {
      sessions.delete(id);
      if (sessions.size <= MAX_SESSIONS) break;
    }
  }

  return {
    getHistory(sessionId) {
      const now = Date.now();
      evictExpired(now);
      const record = sessions.get(sessionId);
      if (!record) return [];
      if (now - record.updatedAt > ttlMs) {
        sessions.delete(sessionId);
        return [];
      }
      return record.messages;
    },

    append(sessionId, messages) {
      const now = Date.now();
      evictExpired(now);
      const record = sessions.get(sessionId) ?? { messages: [], updatedAt: now };
      const next = [...record.messages, ...messages].slice(-MAX_TURNS * 2);
      sessions.set(sessionId, { messages: next, updatedAt: now });
    },

    clear(sessionId) {
      sessions.delete(sessionId);
    },

    size() {
      return sessions.size;
    },
  };
}

/** Session ids are opaque and server-generated; the client never chooses one. */
export function createSessionId(): string {
  return globalThis.crypto.randomUUID();
}

const SESSION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidSessionId(value: unknown): value is string {
  return typeof value === 'string' && SESSION_ID_PATTERN.test(value);
}

/**
 * Module-level singleton for the running server. Kept here rather than in the
 * route so tests can construct isolated stores.
 */
let defaultStore: SessionStore | null = null;

export function getSessionStore(): SessionStore {
  if (!defaultStore) defaultStore = createMemorySessionStore();
  return defaultStore;
}
