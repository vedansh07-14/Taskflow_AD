import React, { useState, useEffect, useCallback } from 'react';
import TaskForm from './TaskForm.jsx';
import '../styles/AddTaskModal.css';

/**
 * In-dashboard Add Task Modal dialog component.
 *
 * Displays a centered dialog with a dark backdrop overlay for creating tasks.
 * Supports Escape key dismissal (disabled while saving), click-outside dismissal,
 * and clean form reset on open/close.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal dialog is visible
 * @param {() => void} props.onClose - Callback to close/cancel the modal dialog
 * @param {(taskData: Object) => Promise<void>} props.onSave - Callback to persist the new task
 */
export default function AddTaskModal({ isOpen, onClose, onSave }) {
  const [submitting, setSubmitting] = useState(false);

  // Close with Escape key unless submission is actively in progress
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape' && !submitting) {
        onClose();
      }
    },
    [onClose, submitting]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  // Backdrop overlay click handler (prevents accidental closing during save)
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && !submitting) {
      onClose();
    }
  };

  const handleFormSave = async (payload) => {
    setSubmitting(true);
    try {
      await onSave(payload);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="add-task-modal-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-task-modal-title"
    >
      <div className="add-task-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="add-task-modal-header">
          <div className="add-task-modal-title-group">
            <h2 id="add-task-modal-title" className="add-task-modal-title">
              Create New Task
            </h2>
            <p className="add-task-modal-subtitle">
              Add a new task to your workspace with priority and due date.
            </p>
          </div>
          <button
            type="button"
            className="add-task-modal-close-btn"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close dialog"
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>

        <div className="add-task-modal-body">
          <TaskForm
            onSave={handleFormSave}
            onCancel={onClose}
            hideHeader={true}
            isExternalSubmitting={submitting}
          />
        </div>
      </div>
    </div>
  );
}
