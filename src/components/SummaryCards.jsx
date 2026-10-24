import React from 'react';
import '../styles/SummaryCards.css';

/**
 * SummaryCards displaying overall task metrics and visual progress percentage.
 *
 * @param {Object} props
 * @param {number} props.total
 * @param {number} props.active
 * @param {number} props.completed
 * @param {number} props.percentComplete
 */
export default function SummaryCards({ total, active, completed, percentComplete }) {
  return (
    <section className="summary-container">
      {/* 3 Metric Cards */}
      <div className="summary-cards-grid">
        <div className="summary-card">
          <div>
            <div className="summary-card-label">Total Tasks</div>
            <div className="summary-card-value">{total}</div>
          </div>
          <div className="summary-card-icon icon-total">📋</div>
        </div>

        <div className="summary-card">
          <div>
            <div className="summary-card-label">Active Tasks</div>
            <div className="summary-card-value">{active}</div>
          </div>
          <div className="summary-card-icon icon-active">⏳</div>
        </div>

        <div className="summary-card">
          <div>
            <div className="summary-card-label">Completed Tasks</div>
            <div className="summary-card-value">{completed}</div>
          </div>
          <div className="summary-card-icon icon-completed">✅</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="progress-card">
        <div className="progress-header">
          <span className="progress-title">Overall Completion</span>
          <span className="progress-percentage">{percentComplete}% Finished</span>
        </div>
        <div className="progress-track" aria-label="Task completion progress">
          <div
            className="progress-fill"
            style={{ width: `${percentComplete}%` }}
          />
        </div>
      </div>
    </section>
  );
}
