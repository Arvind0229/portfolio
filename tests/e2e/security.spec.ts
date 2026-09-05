import { expect, test } from './fixtures';

test.describe('security', () => {
  test('sends the expected security headers', async ({ page }) => {
    const response = await page.goto('/');
    const headers = response?.headers() ?? {};

    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(headers['content-security-policy']).toContain("object-src 'none'");
    expect(headers['permissions-policy']).toContain('camera=()');
    // Fingerprinting surface removed.
    expect(headers['x-powered-by']).toBeUndefined();
  });

  test('no secret or key material appears in the delivered page', async ({ page }) => {
    await page.goto('/');
    const html = await page.content();

    expect(html).not.toMatch(/sk-[a-zA-Z0-9]{16,}/);
    expect(html).not.toMatch(/ANTHROPIC_API_KEY|OPENAI_API_KEY/);
    expect(html).not.toMatch(/PROFILE CONTEXT|BASE_SYSTEM_PROMPT/);
  });

  test('the AI endpoint rejects anything but POST JSON', async ({ request }) => {
    expect((await request.get('/api/ai/chat')).status()).toBe(405);

    const wrongType = await request.post('/api/ai/chat', {
      headers: { 'content-type': 'text/plain' },
      data: 'message=hi',
    });
    expect(wrongType.status()).toBe(415);

    const malformed = await request.post('/api/ai/chat', {
      headers: { 'content-type': 'application/json' },
      data: '{not json',
    });
    expect(malformed.status()).toBe(400);
  });

  test('the AI endpoint refuses an oversized payload', async ({ request }) => {
    const response = await request.post('/api/ai/chat', {
      headers: { 'content-type': 'application/json' },
      data: JSON.stringify({ message: 'a'.repeat(50_000), mode: 'general' }),
    });
    expect([400, 413]).toContain(response.status());
  });

  test('the AI endpoint rate limits a burst', async ({ request }) => {
    let limited = false;
    for (let i = 0; i < 10; i += 1) {
      const response = await request.post('/api/ai/chat', {
        headers: { 'content-type': 'application/json' },
        data: JSON.stringify({ message: 'What does he do?', mode: 'general' }),
      });
      if (response.status() === 429) {
        limited = true;
        expect(response.headers()['retry-after']).toBeTruthy();
        const body = await response.json();
        // The visitor gets a human sentence, not the limiter's internals.
        expect(body.error).not.toMatch(/window|bucket|sliding/i);
        break;
      }
    }
    expect(limited).toBe(true);
  });

  test('the AI endpoint never returns a stack trace', async ({ request }) => {
    const response = await request.post('/api/ai/chat', {
      headers: { 'content-type': 'application/json' },
      data: JSON.stringify({ message: null, mode: 'general' }),
    });
    const text = await response.text();
    expect(text).not.toMatch(/\bat\s+\/|node_modules|\.ts:\d+/);
  });

  test('the health endpoint reports readiness without revealing configuration', async ({
    request,
  }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(JSON.stringify(body)).not.toMatch(/key|token|secret|password|model/i);
  });

  test('robots keeps crawlers out of the API', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(await response.text()).toContain('/api/');
  });

  test('user-supplied text is rendered as text, never as markup', async ({ page }) => {
    await page.goto('/');
    await page.locator('#assistant').scrollIntoViewIfNeeded();

    await page.getByTestId('assistant-input').fill('<img src=x onerror=alert(1)>Tell me his stack');
    await page.getByTestId('assistant-send').click();
    await expect(page.getByTestId('assistant-pending')).toHaveCount(0, { timeout: 20_000 });

    // The literal text must appear in the transcript and no element created.
    const injected = await page.locator('#assistant img[src="x"]').count();
    expect(injected).toBe(0);
  });
});
