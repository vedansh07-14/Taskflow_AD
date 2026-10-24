import React, { useState, useEffect } from 'react';
import '../styles/TaskForm.css';

/**
 * Controlled TaskForm component supporting both creation and non-destructive editing.
 *
 * @param {Object} props
 * @param {Object} [props.initialTask] - Existing task data if in edit mode
 * @param {(taskData: Object) => void} props.onSave - Callback when task is saved/created
 * @param {() => void} props.onCancel - Callback to close/cancel the form
 */
export default function TaskForm({ initialTask, onSave, onCancel }) {
  const isEditing = Boolean(initialTask);

  // Controlled component state initialized from props
  const [title, setTitle] = useState(initialTask?.title || '');
  const [description, setDescription] = useState(initialTask?.description || '');
  const [priority, setPriority] = useState(initialTask?.priority || 'medium');
  const [dueDate, setDueDate] = useState(initialTask?.dueDate || '');
  const [validationError, setValidationError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // If initialTask changes (e.g. switching between tasks), sync the form fields
  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title || '');
      setDescription(initialTask.description || '');
      setPriority(initialTask.priority || 'medium');
      setDueDate(initialTask.dueDate || '');
    } else {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setDueDate('');
    }
    setValidationError('');
  }, [initialTask]);

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation: Title is mandatory and cannot be only whitespace
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setValidationError('Task title is required.');
      return;
    }

    if (trimmedTitle.length > 200) {
      setValidationError('Task title must be under 200 characters.');
      return;
    }

    setSubmitting(true);
    setValidationError('');

    const payload = {
      title: trimmedTitle,
      description: description.trim(),
      priority,
      dueDate: dueDate || null,
    };

    try {
      if (onSave) {
        onSave(payload);
      }
    } catch (err) {
      console.error('Failed to save task:', err);
      setValidationError('An error occurred while saving the task.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="task-form-container">
      <h2 className="task-form-title">{isEditing ? 'Edit Task' : 'Create New Task'}</h2>
      <p className="task-form-subtitle">
        {isEditing
          ? 'Modify task parameters below. Creation date and completion status are preserved.'
          : 'Define a task title, priority, and optional deadline to keep your workspace organized.'}
      </p>

      <form className="task-form" onSubmit={handleSubmit}>
        {/* Title Input (Controlled) */}
        <div className="form-group">
          <label htmlFor="form-task-title" className="form-label">
            Title <span className="form-label-required">*</span>
          </label>
          <input
            id="form-task-title"
            type="text"
            className="form-input"
            placeholder="e.g., Implement local JSON persistence"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (validationError) setValidationError('');
            }}
            maxLength={200}
            autoFocus
          />
          {validationError && <span className="form-error">{validationError}</span>}
        </div>

        {/* Description Textarea (Controlled) */}
        <div className="form-group">
          <label htmlFor="form-task-desc" className="form-label">
            Description
          </label>
          <textarea
            id="form-task-desc"
            className="form-textarea"
            rows="3"
            placeholder="Add relevant notes, checklist items, or details..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
          />
        </div>

        {/* Priority & Due Date (Controlled) */}
        <div className="form-row-2">
          <div className="form-group" style={{ flex: 1 }}>
            <label htmlFor="form-task-priority" className="form-label">
              Priority
            </label>
            <select
              id="form-task-priority"
              className="form-select"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="low">🟢 Low Priority</option>
              <option value="medium">🟡 Medium Priority</option>
              <option value="high">🔴 High Priority</option>
            </select>
          </div>

          <div className="form-group" style={{ flex: 1 }}>
            <label htmlFor="form-task-duedate" className="form-label">
              Due Date
            </label>
            <input
              id="form-task-duedate"
              type="date"
              className="form-input"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        {/* Form Action Buttons */}
        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Task'}
          </button>
        </div>
      </form>
    </div>
  );
}
