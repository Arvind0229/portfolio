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

    /*
     * Clay is the light-first theme now. This assertion used to use
     * Enterprise, which was light-first until it became Crimson — a
     * dark-first theme. The test is checking that switching theme adopts
     * *that theme's* intended mode, so it needs a theme whose intent is
     * light; it is not checking anything about Enterprise specifically.
     */
    await user.click(screen.getByTestId('theme-option-clay'));
    expect(document.documentElement.getAttribute('data-mode')).toBe('light');

    // And the reverse: Crimson is dark-first and must pull the mode back.
    await user.click(screen.getByTestId('theme-option-enterprise'));
    expect(document.documentElement.getAttribute('data-mode')).toBe('dark');
  });

  it('hands light and dark to the lamp rather than duplicating the control', async () => {
    // Two controls for one setting is a UX bug waiting to happen; the panel
    // points at the bulb instead of shipping a second switch.
    const user = userEvent.setup();
    renderControls();

    await user.click(screen.getByTestId('appearance-trigger'));
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.getByText(/pull the cord or click the bulb/i)).toBeInTheDocument();
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
