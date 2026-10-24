import React from 'react';
import '../styles/SummaryCards.css';

/**
 * Reusable metric card displaying a single statistic with an icon and label.
 *
 * @param {Object} props
 * @param {string} props.label - Metric name (e.g. "Total Tasks")
 * @param {number|string} props.value - Numeric display value
 * @param {string} props.icon - Emoji or icon representation
 * @param {'total'|'active'|'completed'} [props.variant='total'] - Color theme
 */
export default function StatsCard({ label, value, icon, variant = 'total' }) {
  return (
    <div className="summary-card">
      <div>
        <div className="summary-card-label">{label}</div>
        <div className="summary-card-value">{value}</div>
      </div>
      <div className={`summary-card-icon icon-${variant}`}>{icon}</div>
    </div>
  );
}
