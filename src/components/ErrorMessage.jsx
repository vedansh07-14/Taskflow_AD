import React from 'react';
import '../styles/TaskList.css';

/**
 * Reusable error message banner with icon, message text, and optional retry action.
 *
 * @param {Object} props
 * @param {string} props.message - Error explanation
 * @param {() => void} [props.onRetry] - Optional retry callback
 */
export default function ErrorMessage({ message, onRetry }) {
  if (!message) return null;

  return (
    <div className="error-banner" role="alert">
      <div className="error-message">
        <span>⚠️</span>
        <span>{message}</span>
      </div>
      {onRetry && (
        <button type="button" className="error-retry-btn" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}
