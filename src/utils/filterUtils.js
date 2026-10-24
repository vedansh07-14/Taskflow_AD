/**
 * Pure utility functions for filtering and calculating task statistics.
 */

/**
 * Filters a task list based on status filter, search query, and priority filter.
 *
 * @param {Array} tasks
 * @param {Object} criteria
 * @param {'all'|'active'|'completed'} criteria.statusFilter
 * @param {string} criteria.searchQuery
 * @param {'all'|'high'|'medium'|'low'} criteria.priorityFilter
 * @returns {Array}
 */
export function filterTasks(tasks, { statusFilter = 'all', searchQuery = '', priorityFilter = 'all' }) {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  return tasks.filter((task) => {
    // 1. Status Filter
    if (statusFilter === 'active' && task.completed) return false;
    if (statusFilter === 'completed' && !task.completed) return false;

    // 2. Priority Filter
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;

    // 3. Search Query (matches title or description)
    if (normalizedQuery) {
      const matchTitle = task.title?.toLowerCase().includes(normalizedQuery);
      const matchDesc = task.description?.toLowerCase().includes(normalizedQuery);
      if (!matchTitle && !matchDesc) return false;
    }

    return true;
  });
}

/**
 * Computes summary metrics and completion percentage for a task collection.
 *
 * @param {Array} tasks
 * @returns {{ total: number, active: number, completed: number, percentComplete: number }}
 */
export function calculateStats(tasks) {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const active = total - completed;
  const percentComplete = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { total, active, completed, percentComplete };
}
