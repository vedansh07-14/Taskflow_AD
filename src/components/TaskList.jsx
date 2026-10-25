import React from 'react';
import TaskCard from './TaskCard.jsx';
import EmptyState from './EmptyState.jsx';
import ErrorMessage from './ErrorMessage.jsx';
import '../styles/TaskList.css';

/**
 * TaskList container that delegates empty and error states to modular subcomponents,
 * distinguishes between global empty state and zero-match search/filter results,
 * and renders TaskCards using stable unique IDs as keys.
 *
 * @param {Object} props
 * @param {Array} props.tasks - Filtered task array
 * @param {number} [props.totalTasksCount=0] - Total task count across all filters
 * @param {boolean} [props.hasActiveFilters=false] - Whether search/priority filters are active
 * @param {boolean} props.loading - Loading state flag
 * @param {string|null} props.error - Error message if any
 * @param {() => void} props.onRetry - Error retry callback
 * @param {() => void} props.onAddTask - Empty state CTA callback
 * @param {() => void} [props.onResetFilters] - Reset search/filter callback
 * @param {(id: string) => void} props.onToggleComplete - Checkbox toggle callback
 * @param {(task: Object) => void} props.onEdit - Edit trigger callback
 * @param {(task: Object) => void} props.onDelete - Delete trigger callback
 */
export default function TaskList({
  tasks,
  totalTasksCount = 0,
  hasActiveFilters = false,
  loading,
  error,
  onRetry,
  onAddTask,
  onResetFilters,
  onToggleComplete,
  onEdit,
  onDelete,
}) {
  // 1. Loading State
  if (loading) {
    return (
      <div className="loading-box" role="status">
        <div className="loading-spinner"></div>
        <div className="loading-text">Loading your tasks...</div>
      </div>
    );
  }

  // 2. Error State (with retry capability)
  if (error) {
    return <ErrorMessage message={error} onRetry={onRetry} />;
  }

  // 3. Empty State Handling
  if (tasks.length === 0) {
    // A. Filtered / Search results with zero matches
    if (hasActiveFilters || (totalTasksCount > 0 && tasks.length === 0)) {
      return (
        <EmptyState
          icon="🔍"
          title="No matching tasks found"
          description="No tasks match your active search or filter criteria. Try adjusting your query or resetting filters."
          actionLabel="Clear Filters"
          onAction={onResetFilters}
        />
      );
    }

    // B. Workspace is genuinely empty
    return (
      <EmptyState
        icon="📝"
        title="No tasks created yet"
        description="Your workspace is clean. Create your first task to start organizing your workflow."
        actionLabel="+ Add Your First Task"
        onAction={onAddTask}
      />
    );
  }

  // 4. Populated Task List with stable unique keys
  return (
    <div className="task-list-container">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onToggleComplete={onToggleComplete}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
