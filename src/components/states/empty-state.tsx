import type { ReactNode } from 'react';

/**
 * "Nothing here" — used where a list can legitimately be empty (a filter with
 * no matches, a section with nothing published yet). A small bot peers into an
 * empty box; the words say what happened and the action says what to do.
 */
export function EmptyState({
  title,
  children,
  action,
  testId,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  testId?: string;
}) {
  return (
    <div className="empty-state surface-card" data-testid={testId}>
      <span className="empty-box" aria-hidden="true">
        <span className="empty-lid" />
        <span className="empty-eyes">
          <span />
          <span />
        </span>
      </span>
      <p className="empty-title">{title}</p>
      {children ? <p className="empty-body">{children}</p> : null}
      {action ? <div className="empty-action">{action}</div> : null}
    </div>
  );
}
