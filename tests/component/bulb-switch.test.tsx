import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BulbSwitch } from '@/components/layout/bulb-switch';
import { AppearanceControls } from '@/components/layout/appearance-controls';
import { AppearanceProvider } from '@/hooks/use-appearance';

function renderBulb() {
  return render(
    <AppearanceProvider>
      <BulbSwitch />
      <AppearanceControls />
    </AppearanceProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-mode');
  document.body.querySelectorAll('.theme-wash').forEach((node) => node.remove());
});

describe('BulbSwitch', () => {
  it('is exposed as a switch with its state, not as decoration', () => {
    renderBulb();
    const bulb = screen.getByTestId('bulb-switch');
    expect(bulb).toHaveAttribute('role', 'switch');
    expect(bulb).toHaveAttribute('aria-checked');
    expect(bulb).toHaveAccessibleName(/dark and light/i);
  });

  it('toggles the document between dark and light', async () => {
    const user = userEvent.setup();
    renderBulb();
    const bulb = screen.getByTestId('bulb-switch');

    const before = document.documentElement.getAttribute('data-mode');
    await user.click(bulb);
    const after = document.documentElement.getAttribute('data-mode');

    expect(after).not.toBe(before);
    expect(['light', 'dark']).toContain(after);
  });

  it('works from the keyboard', async () => {
    const user = userEvent.setup();
    renderBulb();

    const bulb = screen.getByTestId('bulb-switch');
    bulb.focus();
    const before = document.documentElement.getAttribute('data-mode');
    await user.keyboard('{Enter}');

    expect(document.documentElement.getAttribute('data-mode')).not.toBe(before);
  });

  it('persists the choice', async () => {
    const user = userEvent.setup();
    renderBulb();

    await user.click(screen.getByTestId('bulb-switch'));
    expect(localStorage.getItem('ag.mode')).toBe(
      document.documentElement.getAttribute('data-mode'),
    );
  });

  it('remembers the mode chosen for a specific theme', async () => {
    const user = userEvent.setup();
    renderBulb();

    // Enterprise is a light-first theme; force it dark deliberately.
    await user.click(screen.getByTestId('appearance-trigger'));
    await user.click(screen.getByTestId('theme-option-enterprise'));
    expect(document.documentElement.getAttribute('data-mode')).toBe('light');

    await user.click(screen.getByTestId('bulb-switch'));
    expect(document.documentElement.getAttribute('data-mode')).toBe('dark');

    // Clicking the bulb closes the popover (it is an outside click), so it is
    // reopened here exactly as a visitor would.
    await user.click(screen.getByTestId('appearance-trigger'));

    // Leaving and returning must respect the explicit choice, not the default.
    await user.click(screen.getByTestId('theme-option-studio'));
    await user.click(screen.getByTestId('theme-option-enterprise'));
    expect(document.documentElement.getAttribute('data-mode')).toBe('dark');
  });

  it('reflects the current state in aria-checked', async () => {
    const user = userEvent.setup();
    renderBulb();
    const bulb = screen.getByTestId('bulb-switch');

    const checkedBefore = bulb.getAttribute('aria-checked');
    await user.click(bulb);
    expect(bulb.getAttribute('aria-checked')).not.toBe(checkedBefore);
  });

  it('does not leave the transition wash in the DOM', async () => {
    const user = userEvent.setup();
    renderBulb();

    await user.click(screen.getByTestId('bulb-switch'));
    // jsdom reports no reduced-motion preference, so the wash mounts; it must
    // be a transient element, never a permanent compositing layer.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(document.querySelectorAll('.theme-wash')).toHaveLength(0);
  });
});
