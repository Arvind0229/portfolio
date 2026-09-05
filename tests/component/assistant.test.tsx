import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Assistant } from '@/components/ai/assistant';

function mockChat(answer: string, init: ResponseInit = {}) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(
      JSON.stringify({
        ok: true,
        answer,
        mode: 'general',
        sessionId: '11111111-2222-4333-8444-555555555555',
        sources: [{ id: 'skill-data', title: 'Databases & Cloud', section: 'Technical Skills' }],
        toolUsed: 'searchSkills',
        grounded: true,
        suggestions: [],
      }),
      { status: 200, headers: { 'content-type': 'application/json' }, ...init },
    ),
  );
}

describe('Assistant', () => {
  it('greets without calling the API', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(<Assistant />);
    expect(screen.getByTestId('assistant-transcript')).toHaveTextContent(/only from what's in his resume/i);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('sends a question and renders the grounded answer with its sources', async () => {
    const user = userEvent.setup();
    mockChat('He has worked with Oracle, MS SQL Server, MySQL, PostgreSQL and Redshift.');
    render(<Assistant />);

    await user.type(screen.getByTestId('assistant-input'), 'Which databases has he used?');
    await user.click(screen.getByTestId('assistant-send'));

    await waitFor(() => {
      expect(screen.getByTestId('assistant-transcript')).toHaveTextContent(/Oracle/);
    });
    expect(screen.getByTestId('assistant-transcript')).toHaveTextContent('Technical Skills');
  });

  it('sends the selected mode with the request', async () => {
    const user = userEvent.setup();
    const fetchSpy = mockChat('Recruiter-facing answer.');
    render(<Assistant />);

    await user.click(screen.getByTestId('assistant-mode-recruiter'));
    await user.type(screen.getByTestId('assistant-input'), 'Why is he a good fit?');
    await user.click(screen.getByTestId('assistant-send'));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    const body = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body));
    expect(body.mode).toBe('recruiter');
  });

  it('reuses the server-issued session id on the next turn', async () => {
    const user = userEvent.setup();
    const fetchSpy = mockChat('First answer.');
    render(<Assistant />);

    await user.type(screen.getByTestId('assistant-input'), 'What projects has he built?');
    await user.click(screen.getByTestId('assistant-send'));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));

    await user.type(screen.getByTestId('assistant-input'), 'Which of those used Python?');
    await user.click(screen.getByTestId('assistant-send'));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));

    const second = JSON.parse(String(fetchSpy.mock.calls[1]?.[1]?.body));
    expect(second.sessionId).toBe('11111111-2222-4333-8444-555555555555');
  });

  it('runs a suggested starter question', async () => {
    const user = userEvent.setup();
    const fetchSpy = mockChat('An answer.');
    render(<Assistant />);

    const starters = screen.getAllByTestId('assistant-starter');
    expect(starters.length).toBeGreaterThan(0);
    await user.click(starters[0]!);

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
  });

  it('shows a friendly message when the API returns an error', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: false, error: 'Slow down a moment.', code: 'rate_limited' }), {
        status: 429,
        headers: { 'content-type': 'application/json' },
      }),
    );
    render(<Assistant />);

    await user.type(screen.getByTestId('assistant-input'), 'Hello?');
    await user.click(screen.getByTestId('assistant-send'));

    await waitFor(() => {
      expect(screen.getByTestId('assistant-error')).toHaveTextContent('Slow down a moment.');
    });
  });

  it('shows a friendly message when the network fails, never a stack trace', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED at socket.js:42'));
    render(<Assistant />);

    await user.type(screen.getByTestId('assistant-input'), 'Are you there?');
    await user.click(screen.getByTestId('assistant-send'));

    await waitFor(() => expect(screen.getByTestId('assistant-error')).toBeInTheDocument());
    expect(screen.getByTestId('assistant-error')).not.toHaveTextContent('ECONNREFUSED');
  });

  it('will not send an empty question', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(<Assistant />);
    expect(screen.getByTestId('assistant-send')).toBeDisabled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('updates the mode hint so the visitor knows what changed', async () => {
    const user = userEvent.setup();
    render(<Assistant />);

    const hint = screen.getByTestId('assistant-mode-hint');
    const before = hint.textContent;
    await user.click(screen.getByTestId('assistant-mode-business'));
    expect(screen.getByTestId('assistant-mode-hint').textContent).not.toBe(before);
  });

  it('renders the visitor question in the transcript', async () => {
    const user = userEvent.setup();
    mockChat('An answer.');
    render(<Assistant />);

    await user.type(screen.getByTestId('assistant-input'), 'What does he specialise in?');
    await user.click(screen.getByTestId('assistant-send'));

    const transcript = screen.getByTestId('assistant-transcript');
    expect(within(transcript).getByText('What does he specialise in?')).toBeInTheDocument();
  });
});
