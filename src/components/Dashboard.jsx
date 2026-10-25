import React, { useState, useMemo, useEffect } from 'react';
import Sidebar from './Sidebar.jsx';
import DashboardHeader from './DashboardHeader.jsx';
import StatsCard from './StatsCard.jsx';
import ProgressPanel from './ProgressPanel.jsx';
import TaskToolbar from './TaskToolbar.jsx';
import TaskList from './TaskList.jsx';
import TaskForm from './TaskForm.jsx';
import AddTaskModal from './AddTaskModal.jsx';
import ConfirmModal from './ConfirmModal.jsx';
import { useTaskStore } from '../hooks/useTaskStore.js';
import { filterTasks, calculateStats } from '../utils/filterUtils.js';
import '../styles/Dashboard.css';

/**
 * Top-level Dashboard controller connected to the Electron main process
 * and tasks.json persistence layer through the useTaskStore hook.
 *
 * Implements in-dashboard task creation modal and native desktop notifications.
 */
export default function Dashboard() {
  // 1. Data & Persistence Layer (Connected to Electron via window.taskFlow)
  const {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    toggleTask,
    deleteTask,
    reloadTasks,
  } = useTaskStore();

  // 2. Filter & Search States
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // 3. Modal / Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deletingTask, setDeletingTask] = useState(null);

  // 4. In-App Toast Feedback State
  const [toast, setToast] = useState(null);

  const triggerToast = (title, body, icon = '✅') => {
    setToast({ title, body, icon, id: Date.now() });
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Listen for native Application Menu shortcut (CmdOrCtrl+N) to open in-dashboard modal
  useEffect(() => {
    if (window.taskFlow && typeof window.taskFlow.onOpenAddModal === 'function') {
      const unsubscribe = window.taskFlow.onOpenAddModal(() => {
        setIsCreateOpen(true);
      });
      return () => {
        if (typeof unsubscribe === 'function') unsubscribe();
      };
    }
  }, []);

  // Derived state: metrics & visible filtered tasks
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
  // USER ACTION HANDLERS
  // ---------------------------------------------------------

  const handleOpenAddTask = () => {
    // Opens in-dashboard modal dialog directly
    setIsCreateOpen(true);
  };

  const handleCreateTask = async (payload) => {
    try {
      await createTask(payload);
      triggerToast('Task Created', 'Your task has been created successfully.', '✨');
      setIsCreateOpen(false);
    } catch (err) {
      console.error('[Dashboard] Error creating task:', err);
      throw err;
    }
  };

  const handleSaveEditTask = async (payload) => {
    if (!editingTask) return;
    try {
      await updateTask(editingTask.id, payload);
      setEditingTask(null);
      triggerToast('Task Updated', 'Task changes have been saved.', '✏️');
    } catch (err) {
      console.error('[Dashboard] Error saving edited task:', err);
      throw err;
    }
  };

  const handleToggleComplete = async (id) => {
    try {
      const toggled = await toggleTask(id);
      if (toggled && toggled.completed) {
        triggerToast('Task Completed', 'Your task has been marked as completed.', '🎉');
      }
    } catch (err) {
      console.error('[Dashboard] Error toggling task:', err);
    }
  };

  const handleRequestDelete = (task) => {
    setDeletingTask(task);
  };

  const handleConfirmDelete = async () => {
    if (!deletingTask) return;
    try {
      await deleteTask(deletingTask.id);
      triggerToast('Task Deleted', 'The task has been permanently removed.', '🗑️');
      setDeletingTask(null);
    } catch (err) {
      console.error('[Dashboard] Error deleting task:', err);
    }
  };

  const handleCancelDelete = () => {
    setDeletingTask(null);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setPriorityFilter('all');
  };

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
          <DashboardHeader
            title={titleMap[statusFilter]}
            subtitle={`Showing ${visibleTasks.length} of ${tasks.length} total tasks`}
            onAddTask={handleOpenAddTask}
          />

          {/* Composed Metric Cards */}
          <div className="summary-cards-grid" style={{ marginBottom: '16px' }}>
            <StatsCard
              label="Total Tasks"
              value={stats.total}
              icon="📋"
              variant="total"
            />
            <StatsCard
              label="Active Tasks"
              value={stats.active}
              icon="⏳"
              variant="active"
            />
            <StatsCard
              label="Completed Tasks"
              value={stats.completed}
              icon="✅"
              variant="completed"
            />
          </div>

          {/* Composed Progress Panel */}
          <div style={{ marginBottom: '24px' }}>
            <ProgressPanel
              percent={stats.percentComplete}
              title="Overall Completion"
            />
          </div>

          {/* Task Toolbar (Search & Filters) */}
          <TaskToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            priorityFilter={priorityFilter}
            onPriorityChange={setPriorityFilter}
            onResetFilters={handleResetFilters}
            hasActiveFilters={hasActiveFilters}
          />

          {/* Task List (with EmptyState & ErrorMessage) */}
          <TaskList
            tasks={visibleTasks}
            totalTasksCount={tasks.length}
            hasActiveFilters={hasActiveFilters}
            loading={loading}
            error={error}
            onRetry={reloadTasks}
            onAddTask={handleOpenAddTask}
            onResetFilters={handleResetFilters}
            onToggleComplete={handleToggleComplete}
            onEdit={(task) => setEditingTask(task)}
            onDelete={handleRequestDelete}
          />
        </div>
      </main>

      {/* 3. In-Dashboard Add Task Modal */}
      <AddTaskModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSave={handleCreateTask}
      />

      {/* 4. Edit Task Modal */}
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

      {/* 5. Delete Confirmation Dialog */}
      <ConfirmModal
        isOpen={Boolean(deletingTask)}
        title="Delete Task"
        message="Are you sure you want to permanently delete this task? This action cannot be undone."
        targetName={deletingTask?.title}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />

      {/* 6. In-App Toast Notification Banner */}
      {toast && (
        <aside className="toast-container" aria-live="polite">
          <div className="toast-banner" role="status">
            <span className="toast-banner-icon" aria-hidden="true">
              {toast.icon}
            </span>
            <div className="toast-banner-content">
              <span className="toast-banner-title">{toast.title}</span>
              <span className="toast-banner-body">{toast.body}</span>
            </div>
            <button
              type="button"
              className="toast-banner-close"
              onClick={() => setToast(null)}
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}
