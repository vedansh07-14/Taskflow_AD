import React from 'react';
import '../styles/Header.css';

/**
 * Top dashboard header displaying current view title, task counts, and primary action.
 *
 * @param {Object} props
 * @param {string} props.title - Main heading (e.g. "All Tasks")
 * @param {string} props.subtitle - Informative subtitle
 * @param {() => void} props.onAddTask - Callback to initiate task creation
 */
export default function DashboardHeader({ title, subtitle, onAddTask }) {
  return (
    <header className="header-container">
      <div>
        <h1 className="header-title">{title}</h1>
        <p className="header-subtitle">{subtitle}</p>
      </div>

      <button
        type="button"
        className="add-task-btn"
        onClick={onAddTask}
        title="Create New Task (Cmd/Ctrl+N)"
      >
        <span className="add-task-plus">+</span>
        <span>Add Task</span>
      </button>
    </header>
  );
}
