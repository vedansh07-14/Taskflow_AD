import React from 'react';
import '../styles/FilterBar.css';

/**
 * FilterBar providing live keyword search and priority dropdown filtering.
 *
 * @param {Object} props
 * @param {string} props.searchQuery
 * @param {(query: string) => void} props.onSearchChange
 * @param {'all'|'high'|'medium'|'low'} props.priorityFilter
 * @param {(priority: 'all'|'high'|'medium'|'low') => void} props.onPriorityChange
 * @param {() => void} props.onResetFilters
 * @param {boolean} props.hasActiveFilters
 */
export default function FilterBar({
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
            title="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Priority Dropdown */}
      <div className="priority-select-wrapper">
        <label htmlFor="priority-filter-select" className="priority-select-label">
          Priority:
        </label>
        <select
          id="priority-filter-select"
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

      {/* Reset button if any filter is active */}
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
