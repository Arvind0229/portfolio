import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppearanceControls } from '@/components/layout/appearance-controls';
import { AppearanceProvider } from '@/hooks/use-appearance';

function renderControls() {
  return render(
    <AppearanceProvider>
      <AppearanceControls />
    </AppearanceProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-mode');
  document.documentElement.removeAttribute('data-font');
});

describe('AppearanceControls', () => {
  it('opens the panel and exposes every theme and font', async () => {
    const user = userEvent.setup();
    renderControls();

    await user.click(screen.getByTestId('appearance-trigger'));

    expect(screen.getByTestId('appearance-panel')).toBeInTheDocument();
    expect(screen.getByTestId('theme-option-enterprise')).toBeInTheDocument();
    expect(screen.getByTestId('theme-option-engineering')).toBeInTheDocument();
    expect(screen.getByTestId('theme-option-studio')).toBeInTheDocument();
    expect(screen.getByTestId('font-option-precision')).toBeInTheDocument();
    expect(screen.getByTestId('font-option-technical')).toBeInTheDocument();
    expect(screen.getByTestId('font-option-editorial')).toBeInTheDocument();
  });

  it('applies the chosen theme to the document and persists it', async () => {
    const user = userEvent.setup();
    renderControls();

    await user.click(screen.getByTestId('appearance-trigger'));
    await user.click(screen.getByTestId('theme-option-studio'));

    expect(document.documentElement.getAttribute('data-theme')).toBe('studio');
    expect(localStorage.getItem('ag.theme')).toBe('studio');
  });

  it('adopts the theme’s intended colour mode when switching', async () => {
    const user = userEvent.setup();
    renderControls();

    await user.click(screen.getByTestId('appearance-trigger'));
    await user.click(screen.getByTestId('theme-option-engineering'));
    expect(document.documentElement.getAttribute('data-mode')).toBe('dark');

    await user.click(screen.getByTestId('theme-option-enterprise'));
    expect(document.documentElement.getAttribute('data-mode')).toBe('light');
  });

  it('remembers a mode the visitor chose explicitly for a theme', async () => {
    const user = userEvent.setup();
    renderControls();

    await user.click(screen.getByTestId('appearance-trigger'));
    await user.click(screen.getByTestId('theme-option-enterprise'));
    await user.click(screen.getByRole('switch', { name: /dark mode/i }));
    expect(document.documentElement.getAttribute('data-mode')).toBe('dark');

    // Leave and come back — the explicit choice wins over the theme default.
    await user.click(screen.getByTestId('theme-option-studio'));
    await user.click(screen.getByTestId('theme-option-enterprise'));
    expect(document.documentElement.getAttribute('data-mode')).toBe('dark');
  });

  it('applies and persists a font choice', async () => {
    const user = userEvent.setup();
    renderControls();

    await user.click(screen.getByTestId('appearance-trigger'));
    await user.click(screen.getByTestId('font-option-editorial'));

    expect(document.documentElement.getAttribute('data-font')).toBe('editorial');
    expect(localStorage.getItem('ag.font')).toBe('editorial');
  });

  it('marks the active options for assistive technology', async () => {
    const user = userEvent.setup();
    renderControls();

    await user.click(screen.getByTestId('appearance-trigger'));
    await user.click(screen.getByTestId('theme-option-studio'));

    expect(screen.getByTestId('theme-option-studio')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('theme-option-engineering')).toHaveAttribute('aria-pressed', 'false');
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    renderControls();

    await user.click(screen.getByTestId('appearance-trigger'));
    await user.keyboard('{Escape}');

    expect(screen.queryByTestId('appearance-panel')).not.toBeInTheDocument();
  });

  it('survives localStorage being unavailable', async () => {
    const user = userEvent.setup();
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error('QuotaExceededError');
    };

    try {
      renderControls();
      await user.click(screen.getByTestId('appearance-trigger'));
      await user.click(screen.getByTestId('theme-option-studio'));
      // The choice still applies for this visit; it simply is not remembered.
      expect(document.documentElement.getAttribute('data-theme')).toBe('studio');
    } finally {
      Storage.prototype.setItem = setItem;
    }
  });
});
