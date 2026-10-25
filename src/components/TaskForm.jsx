import React, { useState, useEffect } from 'react';
import '../styles/TaskForm.css';

/**
 * Controlled TaskForm component for creating and editing tasks inside dashboard modals.
 *
 * @param {Object} props
 * @param {Object} [props.initialTask] - Existing task data if in edit mode
 * @param {(taskData: Object) => Promise<void>} props.onSave - Callback when task is saved/created
 * @param {() => void} props.onCancel - Callback to close/cancel the form
 * @param {boolean} [props.hideHeader=false] - Whether to hide the built-in title/subtitle header
 * @param {boolean} [props.isExternalSubmitting=false] - External submission state from parent modal
 */
export default function TaskForm({
  initialTask,
  onSave,
  onCancel,
  hideHeader = false,
  isExternalSubmitting = false,
}) {
  const isEditing = Boolean(initialTask);

  // Controlled component state initialized from props
  const [title, setTitle] = useState(initialTask?.title || '');
  const [description, setDescription] = useState(initialTask?.description || '');
  const [priority, setPriority] = useState(initialTask?.priority || 'medium');
  const [dueDate, setDueDate] = useState(initialTask?.dueDate || '');
  const [validationError, setValidationError] = useState('');
  const [localSubmitting, setLocalSubmitting] = useState(false);

  const submitting = isExternalSubmitting || localSubmitting;

  // Sync form fields if initialTask changes or modal opens/closes
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Client-side validation
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setValidationError('Task title is required.');
      return;
    }

    if (trimmedTitle.length > 200) {
      setValidationError('Task title must be under 200 characters.');
      return;
    }

    // Due Date validation
    if (dueDate) {
      const trimmedDate = dueDate.trim();
      const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
      if (!DATE_REGEX.test(trimmedDate)) {
        setValidationError('Invalid date format for due date. Expected YYYY-MM-DD.');
        return;
      }
      const [year, month, day] = trimmedDate.split('-').map(Number);
      const testDate = new Date(Date.UTC(year, month - 1, day));
      if (
        testDate.getUTCFullYear() !== year ||
        testDate.getUTCMonth() !== month - 1 ||
        testDate.getUTCDate() !== day
      ) {
        setValidationError('Invalid calendar date for due date.');
        return;
      }
      if (year < 1970 || year > 2100) {
        setValidationError('Due date year must be between 1970 and 2100.');
        return;
      }
    }

    setLocalSubmitting(true);
    setValidationError('');

    const payload = {
      title: trimmedTitle,
      description: description.trim(),
      priority,
      dueDate: dueDate ? dueDate.trim() : null,
    };

    try {
      if (typeof onSave === 'function') {
        await onSave(payload);
        // Reset form fields on successful creation
        if (!isEditing) {
          setTitle('');
          setDescription('');
          setPriority('medium');
          setDueDate('');
        }
      }
    } catch (err) {
      console.error('[TaskForm] Failed to save task:', err);
      setValidationError(err.message || 'An error occurred while saving the task.');
    } finally {
      setLocalSubmitting(false);
    }
  };

  return (
    <div className={`task-form-container ${hideHeader ? 'no-header' : ''}`}>
      {!hideHeader && (
        <>
          <h2 className="task-form-title">{isEditing ? 'Edit Task' : 'Create New Task'}</h2>
          <p className="task-form-subtitle">
            {isEditing
              ? 'Modify task parameters below. Creation date and completion status are preserved.'
              : 'Define a task title, priority, and optional deadline to keep your workspace organized.'}
          </p>
        </>
      )}

      <form className="task-form" onSubmit={handleSubmit} noValidate>
        {/* Title Input (Controlled & Required) */}
        <div className="form-group">
          <label htmlFor="form-task-title" className="form-label">
            Title <span className="form-label-required">*</span>
          </label>
          <input
            id="form-task-title"
            type="text"
            className={`form-input ${validationError ? 'input-error' : ''}`}
            placeholder="e.g., Complete system architecture review"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (validationError) setValidationError('');
            }}
            maxLength={200}
            disabled={submitting}
            autoFocus
          />
          {validationError && (
            <span className="form-error" role="alert">
              {validationError}
            </span>
          )}
        </div>

        {/* Description Textarea (Controlled & Optional) */}
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
            disabled={submitting}
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
              disabled={submitting}
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
              disabled={submitting}
            />
          </div>
        </div>

        {/* Form Action Buttons */}
        <div className="form-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            disabled={submitting}
          >
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
