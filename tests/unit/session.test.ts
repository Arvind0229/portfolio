import { describe, expect, it } from 'vitest';
import {
  MAX_TURNS,
  createMemorySessionStore,
  createSessionId,
  isValidSessionId,
} from '@/lib/session/store';

describe('session store', () => {
  it('starts empty for an unknown session', () => {
    const store = createMemorySessionStore();
    expect(store.getHistory('missing')).toEqual([]);
  });

  it('appends and returns conversation turns in order', () => {
    const store = createMemorySessionStore();
    const id = createSessionId();
    store.append(id, [
      { role: 'user', content: 'What projects has he worked on?' },
      { role: 'assistant', content: 'Several automation projects.' },
    ]);
    const history = store.getHistory(id);
    expect(history).toHaveLength(2);
    expect(history[0]?.role).toBe('user');
  });

  it('bounds history so a long conversation cannot grow without limit', () => {
    const store = createMemorySessionStore();
    const id = createSessionId();
    for (let i = 0; i < 40; i += 1) {
      store.append(id, [
        { role: 'user', content: `question ${i}` },
        { role: 'assistant', content: `answer ${i}` },
      ]);
    }
    expect(store.getHistory(id).length).toBeLessThanOrEqual(MAX_TURNS * 2);
  });

  it('expires a session after its TTL', async () => {
    const store = createMemorySessionStore(10);
    const id = createSessionId();
    store.append(id, [{ role: 'user', content: 'hello' }]);
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(store.getHistory(id)).toEqual([]);
  });

  it('clears a session on request', () => {
    const store = createMemorySessionStore();
    const id = createSessionId();
    store.append(id, [{ role: 'user', content: 'hello' }]);
    store.clear(id);
    expect(store.getHistory(id)).toEqual([]);
  });

  it('keeps sessions isolated from each other', () => {
    const store = createMemorySessionStore();
    const a = createSessionId();
    const b = createSessionId();
    store.append(a, [{ role: 'user', content: 'from a' }]);
    expect(store.getHistory(b)).toEqual([]);
  });
});

describe('session id validation', () => {
  it('accepts a generated id', () => {
    expect(isValidSessionId(createSessionId())).toBe(true);
  });

  it('rejects anything a client might try to forge', () => {
    expect(isValidSessionId('../../etc/passwd')).toBe(false);
    expect(isValidSessionId('')).toBe(false);
    expect(isValidSessionId(123)).toBe(false);
    expect(isValidSessionId('a'.repeat(64))).toBe(false);
  });
});
