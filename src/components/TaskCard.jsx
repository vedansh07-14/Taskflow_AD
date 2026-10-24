import React from 'react';
import { formatDueDate, isOverdue } from '../utils/dateUtils.js';
import '../styles/TaskCard.css';

/**
 * TaskCard presentational component displaying an individual task with status, badges, and action triggers.
 *
 * @param {Object} props
 * @param {Object} props.task
 * @param {(id: string) => void} props.onToggleComplete
 * @param {(task: Object) => void} props.onEdit
 * @param {(task: Object) => void} props.onDelete
 */
export default function TaskCard({ task, onToggleComplete, onEdit, onDelete }) {
  const overdue = isOverdue(task.dueDate, task.completed);
  const formattedDate = formatDueDate(task.dueDate);

  return (
    <article className={`task-card ${task.completed ? 'is-completed' : ''}`}>
      {/* Complete Checkbox */}
      <div className="task-checkbox-wrapper">
        <input
          type="checkbox"
          className="task-checkbox"
          checked={task.completed}
          onChange={() => onToggleComplete(task.id)}
          aria-label={`Mark "${task.title}" as ${task.completed ? 'incomplete' : 'complete'}`}
        />
      </div>

      {/* Main Task Body */}
      <div className="task-content">
        <div className="task-header-row">
          <h3 className={`task-title ${task.completed ? 'strikethrough' : ''}`}>
            {task.title}
          </h3>

          {/* Action Buttons */}
          <div className="task-actions">
            <button
              type="button"
              className="task-action-btn"
              onClick={() => onEdit(task)}
              title="Edit task"
            >
              ✏️ <span style={{ fontSize: '12px' }}>Edit</span>
            </button>
            <button
              type="button"
              className="task-action-btn btn-delete"
              onClick={() => onDelete(task)}
              title="Delete task"
            >
              🗑️ <span style={{ fontSize: '12px' }}>Delete</span>
            </button>
          </div>
        </div>

        {task.description && (
          <p className="task-description">{task.description}</p>
        )}

        {/* Metadata Chips: Priority & Due Date */}
        <div className="task-meta-row">
          <span className={`priority-badge priority-${task.priority}`}>
            <span>●</span>
            {task.priority} Priority
          </span>

          {task.dueDate && (
            <span className={`due-date-badge ${overdue ? 'overdue' : ''}`}>
              📅 {formattedDate}
              {overdue && <span title="Overdue task!"> (Overdue)</span>}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
