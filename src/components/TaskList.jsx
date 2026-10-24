import React from 'react';
import TaskCard from './TaskCard.jsx';
import '../styles/TaskList.css';

/**
 * TaskList container managing loading, error, empty, and populated task states.
 *
 * @param {Object} props
 * @param {Array} props.tasks
 * @param {boolean} props.loading
 * @param {string|null} props.error
 * @param {() => void} props.onRetry
 * @param {() => void} props.onAddTask
 * @param {(id: string) => void} props.onToggleComplete
 * @param {(task: Object) => void} props.onEdit
 * @param {(id: string) => void} props.onDelete
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
      <div className="loading-box">
        <div className="loading-spinner"></div>
        <div className="loading-text">Loading your desktop tasks...</div>
      </div>
    );
  }

  // 2. Error State
  if (error) {
    return (
      <div className="error-banner">
        <div className="error-message">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
        {onRetry && (
          <button type="button" className="error-retry-btn" onClick={onRetry}>
            Retry
          </button>
        )}
      </div>
    );
  }

  // 3. Empty State
  if (tasks.length === 0) {
    return (
      <div className="state-box">
        <div className="state-icon">📭</div>
        <h3 className="state-title">No tasks found</h3>
        <p className="state-description">
          There are no tasks matching your current view or filter criteria. Create a new task or adjust your search.
        </p>
        <button type="button" className="state-action-btn" onClick={onAddTask}>
          + Create First Task
        </button>
      </div>
    );
  }

  // 4. Populated Task List
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
