import React, { useState } from 'react';
import '../styles/TaskForm.css';

/**
 * TaskForm component supporting both creation and editing modes.
 *
 * @param {Object} props
 * @param {Object} [props.initialTask] - Existing task data for editing
 * @param {(data: Object) => void} [props.onSave] - Callback for in-dashboard modal editing
 * @param {() => void} [props.onCancel] - Callback to close/cancel
 */
export default function TaskForm({ initialTask, onSave, onCancel }) {
  const [title, setTitle] = useState(initialTask?.title || '');
  const [description, setDescription] = useState(initialTask?.description || '');
  const [priority, setPriority] = useState(initialTask?.priority || 'medium');
  const [dueDate, setDueDate] = useState(initialTask?.dueDate || '');
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  const isEditing = Boolean(initialTask);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      setValidationError('Please provide a task title.');
      return;
    }

    setSubmitting(true);
    setValidationError('');

    const taskPayload = {
      title: title.trim(),
      description: description.trim(),
      priority,
      dueDate: dueDate || null,
    };

    try {
      if (onSave) {
        // Modal mode within Dashboard
        onSave(taskPayload);
      } else if (window.electronAPI?.createTask) {
        // Standalone native Electron window mode
        await window.electronAPI.createTask(taskPayload);
        if (window.electronAPI?.closeWindow) {
          window.electronAPI.closeWindow();
        }
      }
    } catch (err) {
      console.error('Failed to save task:', err);
      setValidationError('Failed to save task. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelClick = () => {
    if (onCancel) {
      onCancel();
    } else if (window.electronAPI?.closeWindow) {
      window.electronAPI.closeWindow();
    }
  };

  return (
    <div className="task-form-container">
      <h2 className="task-form-title">{isEditing ? 'Edit Task' : 'Add New Task'}</h2>
      <p className="task-form-subtitle">
        {isEditing ? 'Update the details for this task.' : 'Fill in the information below to add a new task.'}
      </p>

      <form className="task-form" onSubmit={handleSubmit}>
        {/* Title Field */}
        <div className="form-group">
          <label htmlFor="task-title-input" className="form-label">
            Task Title <span className="form-label-required">*</span>
          </label>
          <input
            id="task-title-input"
            type="text"
            className="form-input"
            placeholder="e.g., Complete system architecture review"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (validationError) setValidationError('');
            }}
            autoFocus
          />
          {validationError && <div className="form-error">{validationError}</div>}
        </div>

        {/* Description Field */}
        <div className="form-group">
          <label htmlFor="task-desc-input" className="form-label">
            Description
          </label>
          <textarea
            id="task-desc-input"
            className="form-textarea"
            placeholder="Add relevant notes, steps, or acceptance criteria..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Priority & Due Date Row */}
        <div className="form-row-2">
          <div className="form-group" style={{ flex: 1 }}>
            <label htmlFor="task-priority-input" className="form-label">
              Priority
            </label>
            <select
              id="task-priority-input"
              className="form-select"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="low">🟢 Low</option>
              <option value="medium">🟡 Medium</option>
              <option value="high">🔴 High</option>
            </select>
          </div>

          <div className="form-group" style={{ flex: 1 }}>
            <label htmlFor="task-due-date-input" className="form-label">
              Due Date
            </label>
            <input
              id="task-due-date-input"
              type="date"
              className="form-input"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={handleCancelClick}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Saving...' : isEditing ? 'Update Task' : 'Create Task'}
          </button>
        </div>
      </form>
    </div>
  );
}
