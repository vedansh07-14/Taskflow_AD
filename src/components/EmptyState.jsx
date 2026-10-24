import React from 'react';
import '../styles/TaskList.css';

/**
 * Reusable empty state view with an illustrative icon, title, description, and action button.
 *
 * @param {Object} props
 * @param {string} [props.icon='📭'] - Display emoji or icon
 * @param {string} [props.title='No tasks found'] - Heading
 * @param {string} [props.description] - Helpful guidance or next step
 * @param {string} [props.actionLabel] - Button label (optional)
 * @param {() => void} [props.onAction] - Button action callback (optional)
 */
export default function EmptyState({
  icon = '📭',
  title = 'No tasks found',
  description = 'There are no tasks matching your current view or filter criteria.',
  actionLabel,
  onAction,
}) {
  return (
    <div className="state-box">
      <div className="state-icon">{icon}</div>
      <h3 className="state-title">{title}</h3>
      <p className="state-description">{description}</p>
      {actionLabel && onAction && (
        <button type="button" className="state-action-btn" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
