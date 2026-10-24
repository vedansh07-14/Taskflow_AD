import React from 'react';
import '../styles/SummaryCards.css';

/**
 * Reusable progress tracking panel with title, percentage, and animated fill.
 *
 * @param {Object} props
 * @param {number} props.percent - Percentage completed (0 - 100)
 * @param {string} [props.title='Overall Completion']
 */
export default function ProgressPanel({ percent, title = 'Overall Completion' }) {
  const clampedPercent = Math.min(100, Math.max(0, percent || 0));

  return (
    <div className="progress-card">
      <div className="progress-header">
        <span className="progress-title">{title}</span>
        <span className="progress-percentage">{clampedPercent}% Finished</span>
      </div>
      <div className="progress-track" aria-label="Task completion progress">
        <div
          className="progress-fill"
          style={{ width: `${clampedPercent}%` }}
        />
      </div>
    </div>
  );
}
