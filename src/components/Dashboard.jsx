import React, { useState, useMemo } from 'react';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';
import SummaryCards from './SummaryCards.jsx';
import FilterBar from './FilterBar.jsx';
import TaskList from './TaskList.jsx';
import TaskForm from './TaskForm.jsx';
import ConfirmModal from './ConfirmModal.jsx';
import { initialMockTasks } from '../data/mockTasks.js';
import { filterTasks, calculateStats } from '../utils/filterUtils.js';
import '../styles/Dashboard.css';

/**
 * Utility to generate stable, collision-resistant task IDs.
 * Falls back to timestamp + random string if crypto.randomUUID is unavailable.
 */
function generateTaskId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Top-level Dashboard controller managing master task state, derived filter state,
 * and CRUD modal workflows.
 */
export default function Dashboard() {
  // 1. Master Task State (Single Source of Truth)
  const [tasks, setTasks] = useState(initialMockTasks);

  // 2. Filter & Search States
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // 3. Modal / Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deletingTask, setDeletingTask] = useState(null);

  // 4. Async status flags
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ---------------------------------------------------------
  // DERIVED STATE
  // Instead of storing filtered tasks or metrics in separate useState,
  // we derive them on every render using useMemo. This guarantees
  // filters and stats can never fall out of sync with the master task list.
  // ---------------------------------------------------------
  const stats = useMemo(() => calculateStats(tasks), [tasks]);

  const visibleTasks = useMemo(() => {
    return filterTasks(tasks, {
      statusFilter,
      searchQuery,
      priorityFilter,
    });
  }, [tasks, statusFilter, searchQuery, priorityFilter]);

  const hasActiveFilters = searchQuery !== '' || (priorityFilter !== '' && priorityFilter !== 'all');

  // ---------------------------------------------------------
  // CRUD EVENT HANDLERS
  // ---------------------------------------------------------

  /**
   * Creates a new task and prepends it to the master list.
   * Assigns a stable UUID and timestamps.
   */
  const handleCreateTask = (payload) => {
    const now = new Date().toISOString();
    const newTask = {
      id: generateTaskId(),
      title: payload.title,
      description: payload.description || '',
      priority: payload.priority || 'medium',
      status: 'todo',
      completed: false,
      dueDate: payload.dueDate || null,
      createdAt: now,
      updatedAt: now,
    };

    setTasks((prevTasks) => [newTask, ...prevTasks]);
    setIsCreateOpen(false);
  };

  /**
   * Non-destructive task editing.
   * Merges user updates with the original task to ensure fields like id,
   * createdAt, completed status, and tags are never accidentally wiped out.
   */
  const handleSaveEditTask = (payload) => {
    if (!editingTask) return;

    setTasks((prevTasks) =>
      prevTasks.map((t) => {
        if (t.id === editingTask.id) {
          return {
            ...t, // Preserves untouched fields (id, createdAt, completed, status)
            title: payload.title,
            description: payload.description,
            priority: payload.priority,
            dueDate: payload.dueDate,
            updatedAt: new Date().toISOString(),
          };
        }
        return t;
      })
    );
    setEditingTask(null);
  };

  /**
   * Toggles task completion state between complete and active.
   */
  const handleToggleComplete = (id) => {
    setTasks((prevTasks) =>
      prevTasks.map((t) => {
        if (t.id === id) {
          const nextCompleted = !t.completed;
          return {
            ...t,
            completed: nextCompleted,
            status: nextCompleted ? 'completed' : 'todo',
            updatedAt: new Date().toISOString(),
          };
        }
        return t;
      })
    );
  };

  /**
   * Initiates delete flow by prompting confirmation modal.
   */
  const handleRequestDelete = (task) => {
    setDeletingTask(task);
  };

  /**
   * Permanently removes task after user confirms.
   */
  const handleConfirmDelete = () => {
    if (!deletingTask) return;
    setTasks((prevTasks) => prevTasks.filter((t) => t.id !== deletingTask.id));
    setDeletingTask(null);
  };

  const handleCancelDelete = () => {
    setDeletingTask(null);
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
            onAddTask={() => setIsCreateOpen(true)}
          />

          {/* Metric Cards & Overall Completion Progress Bar */}
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

          {/* Task Collection, Empty State, Loading, and Error Banners */}
          <TaskList
            tasks={visibleTasks}
            loading={loading}
            error={error}
            onRetry={() => setError(null)}
            onAddTask={() => setIsCreateOpen(true)}
            onToggleComplete={handleToggleComplete}
            onEdit={(task) => setEditingTask(task)}
            onDelete={handleRequestDelete}
          />
        </div>
      </main>

      {/* Create Task Modal */}
      {isCreateOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <TaskForm
              onSave={handleCreateTask}
              onCancel={() => setIsCreateOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="modal-overlay" onClick={() => setEditingTask(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <TaskForm
              initialTask={editingTask}
              onSave={handleSaveEditTask}
              onCancel={() => setEditingTask(null)}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmModal
        isOpen={Boolean(deletingTask)}
        title="Delete Task"
        message="Are you sure you want to permanently delete this task? This cannot be undone."
        targetName={deletingTask?.title}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}
