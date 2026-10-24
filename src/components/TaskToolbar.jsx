import React from 'react';
import '../styles/FilterBar.css';

/**
 * TaskToolbar providing live search input, priority dropdown filter, and filter reset.
 *
 * @param {Object} props
 * @param {string} props.searchQuery - Current search string
 * @param {(query: string) => void} props.onSearchChange - Search update callback
 * @param {'all'|'high'|'medium'|'low'} props.priorityFilter - Active priority filter
 * @param {(priority: 'all'|'high'|'medium'|'low') => void} props.onPriorityChange - Priority update callback
 * @param {() => void} props.onResetFilters - Callback to clear all active filters
 * @param {boolean} props.hasActiveFilters - Whether filters/search are currently applied
 */
export default function TaskToolbar({
  searchQuery,
  onSearchChange,
  priorityFilter,
  onPriorityChange,
  onResetFilters,
  hasActiveFilters,
}) {
  return (
    <div className="filter-bar-container">
      {/* Search Input Field */}
      <div className="search-wrapper">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          className="search-input"
          placeholder="Search tasks by title or description..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchQuery && (
          <button
            type="button"
            className="search-clear-btn"
            onClick={() => onSearchChange('')}
            title="Clear search input"
          >
            ✕
          </button>
        )}
      </div>

      {/* Priority Selector Dropdown */}
      <div className="priority-select-wrapper">
        <label htmlFor="toolbar-priority-select" className="priority-select-label">
          Priority:
        </label>
        <select
          id="toolbar-priority-select"
          className="priority-select"
          value={priorityFilter}
          onChange={(e) => onPriorityChange(e.target.value)}
        >
          <option value="all">All Priorities</option>
          <option value="high">🔴 High Priority</option>
          <option value="medium">🟡 Medium Priority</option>
          <option value="low">🟢 Low Priority</option>
        </select>
      </div>

      {/* Reset Filter Button */}
      {hasActiveFilters && (
        <button
          type="button"
          className="filter-reset-btn"
          onClick={onResetFilters}
          title="Reset search and filters"
        >
          Reset Filters
        </button>
      )}
    </div>
  );
}
