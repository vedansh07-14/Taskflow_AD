import React from 'react';
import '../styles/Header.css';

/**
 * Top Header component displaying current view title and the Add Task trigger.
 *
 * @param {Object} props
 * @param {string} props.title
 * @param {string} props.subtitle
 * @param {() => void} props.onAddTask
 */
export default function Header({ title, subtitle, onAddTask }) {
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
        title="Open Add Task Window (Cmd/Ctrl+N)"
      >
        <span className="add-task-plus">+</span>
        <span>Add Task</span>
      </button>
    </header>
  );
}
