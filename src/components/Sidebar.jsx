import React from 'react';
import '../styles/Sidebar.css';

/**
 * Sidebar navigation component for filtering task collections.
 *
 * @param {Object} props
 * @param {'all'|'active'|'completed'} props.currentFilter
 * @param {(filter: 'all'|'active'|'completed') => void} props.onSelectFilter
 * @param {{ total: number, active: number, completed: number }} props.stats
 */
export default function Sidebar({ currentFilter, onSelectFilter, stats }) {
  const navItems = [
    { id: 'all', label: 'All Tasks', icon: '📋', count: stats.total },
    { id: 'active', label: 'Active', icon: '⚡', count: stats.active },
    { id: 'completed', label: 'Completed', icon: '✓', count: stats.completed },
  ];

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo-icon">TF</div>
        <div>
          <div className="sidebar-title">TaskFlow Pro</div>
          <div className="sidebar-subtitle">Desktop Workspace</div>
        </div>
      </div>

      {/* Navigation Filter Buttons */}
      <nav className="sidebar-nav">
        <div className="sidebar-nav-heading">Views</div>
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`sidebar-nav-btn ${currentFilter === item.id ? 'active' : ''}`}
            onClick={() => onSelectFilter(item.id)}
          >
            <span className="sidebar-nav-label">
              <span className="sidebar-nav-icon">{item.icon}</span>
              {item.label}
            </span>
            <span className="sidebar-badge">{item.count}</span>
          </button>
        ))}
      </nav>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-footer-info">
          <span>
            <span className="status-dot"></span>
            Offline Storage
          </span>
          <span>v1.0</span>
        </div>
      </div>
    </aside>
  );
}
