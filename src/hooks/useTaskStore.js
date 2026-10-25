import { useState, useEffect, useCallback } from 'react';

/**
 * Custom React hook connecting the TaskFlow Pro frontend to the Electron
 * main process and tasks.json persistence layer via window.taskFlow.
 *
 * Integrates native OS notifications for task creation and completion.
 */
export function useTaskStore() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isElectronAvailable = Boolean(window.taskFlow && typeof window.taskFlow.listTasks === 'function');

  /**
   * Fetches all tasks from tasks.json via IPC with defensive error handling.
   */
  const loadTasks = useCallback(async () => {
    if (!isElectronAvailable) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const data = await window.taskFlow.listTasks();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[useTaskStore] Failed to load tasks from main process:', err);
      setError(`Failed to read tasks from disk: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [isElectronAvailable]);

  // Initial fetch and real-time subscription with unmount protection
  useEffect(() => {
    let isMounted = true;

    const safeLoad = async () => {
      if (!isElectronAvailable) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        if (isMounted) setError(null);
        const data = await window.taskFlow.listTasks();
        if (isMounted) {
          setTasks(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (isMounted) {
          console.error('[useTaskStore] Failed to load tasks from main process:', err);
          setError(`Failed to read tasks from disk: ${err.message}`);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    safeLoad();

    let unsubscribe = null;
    if (isElectronAvailable && typeof window.taskFlow.onTasksChanged === 'function') {
      unsubscribe = window.taskFlow.onTasksChanged(() => {
        if (isMounted) safeLoad();
      });
    }

    return () => {
      isMounted = false;
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [isElectronAvailable]);

  /**
   * Creates a new task and triggers a native desktop notification upon success.
   */
  const createTask = async (taskData) => {
    if (!isElectronAvailable) {
      console.warn('[useTaskStore] Running in browser mode without Electron. Creating in-memory task.');
      const now = new Date().toISOString();
      const fallbackTask = {
        id: 'browser-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9),
        title: taskData.title.trim(),
        description: (taskData.description || '').trim(),
        priority: taskData.priority || 'medium',
        status: 'todo',
        completed: false,
        dueDate: taskData.dueDate || null,
        createdAt: now,
        updatedAt: now,
      };
      setTasks((prev) => [fallbackTask, ...prev]);
      return fallbackTask;
    }

    try {
      const created = await window.taskFlow.addTask(taskData);
      setTasks((prev) => {
        if (prev.some((t) => t.id === created.id)) return prev;
        return [created, ...prev];
      });

      // Show native desktop notification: Task Created
      if (typeof window.taskFlow.notify === 'function') {
        window.taskFlow.notify({
          type: 'task_created',
          title: 'TaskFlow Pro',
          body: 'Your task has been created successfully.',
        }).catch((notifErr) => console.warn('[useTaskStore] Notification warning:', notifErr));
      }

      return created;
    } catch (err) {
      setError(`Could not create task: ${err.message}`);
      throw err;
    }
  };

  /**
   * Updates an existing task.
   */
  const updateTask = async (id, updates) => {
    if (!isElectronAvailable) {
      console.warn('[useTaskStore] Running in browser mode. Updating task in-memory.');
      let updatedTask = null;
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === id) {
            updatedTask = {
              ...t,
              ...updates,
              updatedAt: new Date().toISOString(),
            };
            return updatedTask;
          }
          return t;
        })
      );
      return updatedTask;
    }

    try {
      const updated = await window.taskFlow.updateTask(id, updates);
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      return updated;
    } catch (err) {
      setError(`Could not update task: ${err.message}`);
      throw err;
    }
  };

  /**
   * Toggles task completion state.
   * Shows a native desktop notification confirming completion when marked done.
   */
  const toggleTask = async (id) => {
    // Find target task for notification reference
    const currentTask = tasks.find((t) => t.id === id);
    const willBeCompleted = currentTask ? !currentTask.completed : false;

    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => {
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

    if (!isElectronAvailable) return;

    try {
      const toggled = await window.taskFlow.toggleTask(id);
      setTasks((prev) => prev.map((t) => (t.id === id ? toggled : t)));

      // Show native desktop notification when task transitions to completed
      if (toggled && toggled.completed && typeof window.taskFlow.notify === 'function') {
        window.taskFlow.notify({
          type: 'task_completed',
          title: 'TaskFlow Pro',
          body: 'Your task has been marked as completed.',
          taskTitle: toggled.title,
        }).catch((notifErr) => console.warn('[useTaskStore] Notification warning:', notifErr));
      }

      return toggled;
    } catch (err) {
      setError(`Could not toggle task: ${err.message}`);
      await loadTasks();
      throw err;
    }
  };

  /**
   * Deletes a task by ID.
   */
  const deleteTask = async (id) => {
    const previousTasks = [...tasks];
    setTasks((prev) => prev.filter((t) => t.id !== id));

    if (!isElectronAvailable) return;

    try {
      await window.taskFlow.deleteTask(id);
    } catch (err) {
      setError(`Could not delete task: ${err.message}`);
      setTasks(previousTasks);
      throw err;
    }
  };

  const openAddWindow = async () => {
    if (isElectronAvailable && typeof window.taskFlow.openAddWindow === 'function') {
      return await window.taskFlow.openAddWindow();
    }
    return { success: false };
  };

  return {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    toggleTask,
    deleteTask,
    openAddWindow,
    reloadTasks: loadTasks,
    isElectronAvailable,
  };
}
