'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Reveal, Section, SectionHeading } from '@/components/ui';
import { assistantModes, suggestedQuestions } from '@/data/site';
import { MAX_MESSAGE_LENGTH } from '@/lib/ai/guardrails';
import { cn } from '@/lib/utils/cn';
import type { AssistantMode, AssistantSource } from '@/types';

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: AssistantSource[];
}

const GREETING: DisplayMessage = {
  id: 'greeting',
  role: 'assistant',
  content:
    "Ask me about Arvind's experience, his automation projects, the technologies he works with, or how to get in touch. I answer only from what's in his resume — if something isn't there, I'll say so rather than guess.",
};

/**
 * AI assistant.
 *
 * Native to the page rather than a floating widget: it uses the same tokens,
 * the same glass treatment and the same motion language as everything else,
 * and it sits in the reading order where a visitor would naturally reach for
 * it — after the work, before the contact details.
 */
export function Assistant() {
  const [mode, setMode] = useState<AssistantMode>('general');
  const [messages, setMessages] = useState<DisplayMessage[]>([GREETING]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputId = useId();

  const activeMode = assistantModes.find((item) => item.id === mode);
  const starters = suggestedQuestions[mode] ?? suggestedQuestions.general ?? [];

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTop = list.scrollHeight;
  }, [messages, pending]);

  const send = useCallback(
    async (raw: string) => {
      const question = raw.trim();
      if (question.length === 0 || pending) return;

      setError(null);
      setInput('');
      setMessages((current) => [
        ...current,
        { id: `u-${Date.now()}`, role: 'user', content: question },
      ]);
      setPending(true);

      try {
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            message: question,
            mode,
            ...(sessionRef.current ? { sessionId: sessionRef.current } : {}),
          }),
        });

        const payload: unknown = await response.json().catch(() => null);

        if (!response.ok || !payload || typeof payload !== 'object' || !('ok' in payload)) {
          const message =
            payload && typeof payload === 'object' && 'error' in payload
              ? String((payload as { error: unknown }).error)
              : "I couldn't reach the assistant just now. Everything on this page is still available — or email Arvind directly.";
          setError(message);
          return;
        }

        if ((payload as { ok: boolean }).ok !== true) {
          setError(String((payload as { error?: unknown }).error ?? 'Something went wrong.'));
          return;
        }

        const body = payload as unknown as {
          answer: string;
          sessionId: string;
          sources: AssistantSource[];
        };
        sessionRef.current = body.sessionId;
        setMessages((current) => [
          ...current,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            content: body.answer,
            sources: body.sources,
          },
        ]);
      } catch {
        setError(
          "The assistant is unreachable — that's usually a network hiccup. The sections above have the same information.",
        );
      } finally {
        setPending(false);
      }
    },
    [mode, pending],
  );

  return (
    <Section id="assistant" ariaLabel="AI professional assistant">
      <SectionHeading
        eyebrow="AI Assistant"
        title="Ask about the work, get a grounded answer"
        description="This assistant is wired to Arvind's resume and nothing else. It retrieves the relevant part of his profile before it answers, and it will tell you plainly when something isn't in there."
      />

      <Reveal delay={80}>
        <div className="glass mt-10 overflow-hidden">
          {/* Modes */}
          <div className="border-b border-[var(--glass-border)] p-4 sm:p-5">
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="Assistant conversation mode"
            >
              {assistantModes.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMode(item.id)}
                  aria-pressed={mode === item.id}
                  data-testid={`assistant-mode-${item.id}`}
                  title={item.description}
                  className={cn(
                    'rounded-full border px-3.5 py-1.5 text-[0.78rem] transition-colors duration-[var(--motion-fast)]',
                    mode === item.id
                      ? 'border-[var(--accent-primary)] bg-[color-mix(in_srgb,var(--accent-primary)_8%,transparent)] text-[var(--accent-primary)]'
                      : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]',
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {activeMode ? (
              <p className="mt-3 text-[0.78rem] text-[var(--text-muted)]" data-testid="assistant-mode-hint">
                {activeMode.hint}
              </p>
            ) : null}
          </div>

          {/* Transcript */}
          <div
            ref={listRef}
            data-testid="assistant-transcript"
            className="max-h-[26rem] min-h-[16rem] space-y-4 overflow-y-auto p-4 sm:p-5"
            role="log"
            aria-live="polite"
            aria-label="Conversation"
          >
            {messages.map((message) => (
              <Message key={message.id} message={message} />
            ))}

            {pending ? (
              <div className="flex items-center gap-2 text-[0.82rem] text-[var(--text-muted)]" data-testid="assistant-pending">
                <span className="flex gap-1" aria-hidden="true">
                  {[0, 1, 2].map((dot) => (
                    <span
                      key={dot}
                      className="h-1.5 w-1.5 rounded-full bg-[var(--accent-primary)]"
                      style={{ animation: `typing-dot 1.2s ${dot * 0.15}s infinite` }}
                    />
                  ))}
                </span>
                Looking through the profile…
              </div>
            ) : null}

            {error ? (
              <p
                role="alert"
                data-testid="assistant-error"
                className="rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--error)_40%,transparent)] bg-[color-mix(in_srgb,var(--error)_10%,transparent)] p-3 text-[0.85rem] text-[var(--error)]"
              >
                {error}
              </p>
            ) : null}
          </div>

          {/* Starters */}
          {messages.length <= 2 ? (
            <div className="flex flex-wrap gap-2 px-4 pb-3 sm:px-5">
              {starters.slice(0, 3).map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => void send(question)}
                  disabled={pending}
                  data-testid="assistant-starter"
                  className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 py-1.5 text-left text-[0.76rem] text-[var(--text-secondary)] transition-colors duration-[var(--motion-fast)] hover:border-[var(--accent-primary)] hover:text-[var(--text-primary)] disabled:opacity-50"
                >
                  {question}
                </button>
              ))}
            </div>
          ) : null}

          {/* Composer */}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void send(input);
            }}
            className="flex items-end gap-2 border-t border-[var(--glass-border)] p-3 sm:p-4"
          >
            <label htmlFor={inputId} className="sr-only">
              Ask the assistant a question
            </label>
            <textarea
              id={inputId}
              value={input}
              onChange={(event) => setInput(event.target.value.slice(0, MAX_MESSAGE_LENGTH))}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void send(input);
                }
              }}
              rows={1}
              maxLength={MAX_MESSAGE_LENGTH}
              placeholder="Ask about his experience, a project, or a technology…"
              data-testid="assistant-input"
              className="max-h-32 min-h-[2.75rem] flex-1 resize-none rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 text-[0.88rem] text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus-visible:border-[var(--accent-primary)]"
            />
            <button
              type="submit"
              disabled={pending || input.trim().length === 0}
              data-testid="assistant-send"
              className="inline-flex h-[2.75rem] items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--accent-primary)] px-4 text-[0.85rem] font-medium text-[var(--accent-contrast)] transition-[filter,opacity] duration-[var(--motion-fast)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send
              <span aria-hidden="true">→</span>
            </button>
          </form>
        </div>
      </Reveal>

      <p className="mt-4 text-[0.78rem] text-[var(--text-subtle)]">
        Answers are generated from Arvind&apos;s resume. Nothing you type here is stored beyond the
        length of the conversation, and the assistant has no access to anything outside his profile.
      </p>
    </Section>
  );
}

function Message({ message }: { message: DisplayMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[92%] sm:max-w-[80%]')}>
        <p
          className={cn(
            'rounded-[var(--radius-lg)] px-4 py-3 text-[0.88rem] leading-relaxed',
            isUser
              ? 'bg-[var(--accent-primary)] text-[var(--accent-contrast)]'
              : 'border border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-secondary)]',
          )}
        >
          {message.content}
        </p>
        {message.sources && message.sources.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Answer sources">
            {message.sources.map((source) => (
              <li
                key={source.id}
                className="rounded-full border border-[var(--border-subtle)] px-2 py-0.5 font-mono text-[0.65rem] text-[var(--text-subtle)]"
              >
                {source.section}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
