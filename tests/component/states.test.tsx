import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '@/components/states/empty-state';
import { StatusOrb } from '@/components/ui/status-orb';
import { ErrorScene, SCENES } from '@/components/states/error-scene';

describe('status orb', () => {
  it('shows exactly the state it is given', () => {
    const { container, rerender } = render(<StatusOrb state="working" progress={40} />);
    expect(container.querySelector('.status-orb')?.getAttribute('data-state')).toBe('working');
    expect(container.querySelector('.status-orb')?.getAttribute('data-indeterminate')).toBeNull();
    rerender(<StatusOrb state="working" />);
    expect(container.querySelector('.status-orb')?.getAttribute('data-indeterminate')).toBe('true');
    rerender(<StatusOrb state="error" />);
    expect(container.querySelector('.status-orb')?.getAttribute('data-state')).toBe('error');
  });
});

describe('empty state', () => {
  it('says what happened and offers the action', () => {
    render(<EmptyState title="No projects in Reporting" action={<button type="button">Show every project</button>} />);
    expect(screen.getByText('No projects in Reporting')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Show every project' })).toBeTruthy();
  });
});

describe('error scene', () => {
  it('has a real heading and only offers retry when given one', () => {
    render(<ErrorScene kind="404" />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Error 404');
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  });

  it('never shows anything but its own copy and an opaque reference', () => {
    render(<ErrorScene kind="500" onRetry={() => {}} detail="abc123" />);
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
    expect(screen.getByText('Reference: abc123')).toBeTruthy();
  });

  it('has copy for every kind', () => {
    for (const scene of Object.values(SCENES)) {
      expect(scene.title.length).toBeGreaterThan(0);
      expect(scene.lines.length).toBeGreaterThan(0);
    }
  });
});
