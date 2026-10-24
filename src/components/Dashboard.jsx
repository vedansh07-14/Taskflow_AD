import React, { useState } from 'react';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';
import SummaryCards from './SummaryCards.jsx';
import FilterBar from './FilterBar.jsx';
import TaskList from './TaskList.jsx';
import TaskForm from './TaskForm.jsx';
import { initialMockTasks } from '../data/mockTasks.js';
import { filterTasks, calculateStats } from '../utils/filterUtils.js';
import '../styles/Dashboard.css';

/**
 * Top-level Dashboard controller managing UI layout, mock state, and filter controls.
 */
export default function Dashboard() {
  const [tasks, setTasks] = useState(initialMockTasks);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [editingTask, setEditingTask] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Derive stats across all tasks
  const stats = calculateStats(tasks);

  // Apply active search & filters
  const visibleTasks = filterTasks(tasks, {
    statusFilter,
    searchQuery,
    priorityFilter,
  });

  const hasActiveFilters = searchQuery !== '' || (priorityFilter !== '' && priorityFilter !== 'all');

  // Task actions (Frontend Mock Handlers)
  const handleToggleComplete = (id) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id === id) {
          const nextCompleted = !task.completed;
          return {
            ...task,
            completed: nextCompleted,
            status: nextCompleted ? 'completed' : 'todo',
            updatedAt: new Date().toISOString(),
          };
        }
        return task;
      })
    );
  };

  const handleDeleteTask = (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleOpenAddTask = () => {
    // If running inside Electron, trigger the standalone native window
    if (window.electronAPI?.openAddTaskWindow) {
      window.electronAPI.openAddTaskWindow();
    } else {
      // Browser fallback: create a demo task for immediate visual testing
      const newTask = {
        id: `task-${Date.now()}`,
        title: `Task #${tasks.length + 1} (Test)`,
        description: 'Created from Add Task button for demonstration.',
        priority: 'medium',
        status: 'todo',
        completed: false,
        dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setTasks((prev) => [newTask, ...prev]);
    }
  };

  const handleSaveEdit = (updatedData) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === editingTask.id ? { ...t, ...updatedData, updatedAt: new Date().toISOString() } : t))
    );
    setEditingTask(null);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setPriorityFilter('all');
  };

  // Header Title mapping
  const titleMap = {
    all: 'All Tasks',
    active: 'Active Tasks',
    completed: 'Completed Tasks',
  };

  return (
    <div className="dashboard-layout">
      {/* 1. Left Sidebar Navigation */}
      <Sidebar
        currentFilter={statusFilter}
        onSelectFilter={setStatusFilter}
        stats={stats}
      />

      {/* 2. Main Content View */}
      <main className="dashboard-main">
        <div className="dashboard-content">
          {/* Header */}
          <Header
            title={titleMap[statusFilter]}
            subtitle={`Showing ${visibleTasks.length} of ${tasks.length} total tasks`}
            onAddTask={handleOpenAddTask}
          />

          {/* Metric Cards & Progress Bar */}
          <SummaryCards
            total={stats.total}
            active={stats.active}
            completed={stats.completed}
            percentComplete={stats.percentComplete}
          />

          {/* Search Field & Priority Dropdown */}
          <FilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            priorityFilter={priorityFilter}
            onPriorityChange={setPriorityFilter}
            onResetFilters={handleResetFilters}
            hasActiveFilters={hasActiveFilters}
          />

          {/* Task Collection / Empty / Loading States */}
          <TaskList
            tasks={visibleTasks}
            loading={loading}
            error={error}
            onRetry={() => setError(null)}
            onAddTask={handleOpenAddTask}
            onToggleComplete={handleToggleComplete}
            onEdit={(task) => setEditingTask(task)}
            onDelete={handleDeleteTask}
          />
        </div>
      </main>

      {/* Optional Edit Modal for rapid in-dashboard editing */}
      {editingTask && (
        <div className="modal-overlay" onClick={() => setEditingTask(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <TaskForm
              initialTask={editingTask}
              onSave={handleSaveEdit}
              onCancel={() => setEditingTask(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
