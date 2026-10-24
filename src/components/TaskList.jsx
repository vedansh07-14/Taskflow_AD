import React from 'react';
import TaskCard from './TaskCard.jsx';
import EmptyState from './EmptyState.jsx';
import ErrorMessage from './ErrorMessage.jsx';
import '../styles/TaskList.css';

/**
 * TaskList container that delegates empty and error states to modular subcomponents,
 * and renders TaskCards using stable unique IDs as keys.
 *
 * @param {Object} props
 * @param {Array} props.tasks - Filtered task array
 * @param {boolean} props.loading - Loading state flag
 * @param {string|null} props.error - Error message if any
 * @param {() => void} props.onRetry - Error retry callback
 * @param {() => void} props.onAddTask - Empty state CTA callback
 * @param {(id: string) => void} props.onToggleComplete - Checkbox toggle callback
 * @param {(task: Object) => void} props.onEdit - Edit trigger callback
 * @param {(task: Object) => void} props.onDelete - Delete trigger callback
 */
export default function TaskList({
  tasks,
  loading,
  error,
  onRetry,
  onAddTask,
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

  // 2. Error State (using modular ErrorMessage component)
  if (error) {
    return <ErrorMessage message={error} onRetry={onRetry} />;
  }

  // 3. Empty State (using modular EmptyState component)
  if (tasks.length === 0) {
    return (
      <EmptyState
        icon="📭"
        title="No tasks found"
        description="There are no tasks matching your current view or filter criteria. Create a new task or adjust your search."
        actionLabel="+ Create First Task"
        onAction={onAddTask}
      />
    );
  }

  // 4. Populated Task List with stable keys
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
