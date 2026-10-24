import React from 'react';
import '../styles/ConfirmModal.css';

/**
 * Reusable confirmation dialog for destructive actions (e.g. deleting a task).
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {string} props.title - Dialog title
 * @param {string} props.message - Descriptive warning message
 * @param {string} [props.targetName] - Name of the item being deleted
 * @param {() => void} props.onConfirm - Action on confirming deletion
 * @param {() => void} props.onCancel - Action on cancelling
 */
export default function ConfirmModal({
  isOpen,
  title = 'Delete Task',
  message = 'Are you sure you want to permanently delete this task? This action cannot be undone.',
  targetName,
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  return (
    <div className="confirm-modal-overlay" onClick={onCancel}>
      <div className="confirm-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-modal-header">
          <div className="confirm-modal-icon">🗑️</div>
          <h3 className="confirm-modal-title">{title}</h3>
        </div>

        <div className="confirm-modal-message">
          <p>{message}</p>
          {targetName && (
            <span className="confirm-modal-target-title">"{targetName}"</span>
          )}
        </div>

        <div className="confirm-modal-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn-danger" onClick={onConfirm} autoFocus>
            Delete Task
          </button>
        </div>
      </div>
    </div>
  );
}
