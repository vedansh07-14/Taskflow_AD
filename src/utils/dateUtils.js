/**
 * Formats an ISO date string (YYYY-MM-DD) into a user-friendly label.
 * Returns relative indicators ('Today', 'Tomorrow', 'Yesterday') or formatted date.
 *
 * @param {string|null} dateString
 * @returns {string}
 */
export function formatDueDate(dateString) {
  if (!dateString) return 'No due date';

  const date = new Date(dateString + 'T00:00:00');
  if (isNaN(date.getTime())) return 'Invalid date';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Determines whether a task is overdue.
 * A task is overdue only if it is incomplete and its due date is in the past.
 *
 * @param {string|null} dateString
 * @param {boolean} isCompleted
 * @returns {boolean}
 */
export function isOverdue(dateString, isCompleted) {
  if (!dateString || isCompleted) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(dateString + 'T00:00:00');
  target.setHours(0, 0, 0, 0);

  return target < today;
}
