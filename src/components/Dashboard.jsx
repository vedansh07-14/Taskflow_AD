import React, { useState, useEffect } from 'react';

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTasks() {
      try {
        if (window.electronAPI?.getAllTasks) {
          const list = await window.electronAPI.getAllTasks();
          setTasks(list);
        }
      } catch (err) {
        console.error('Failed to load tasks:', err);
      } finally {
        setLoading(false);
      }
    }

    loadTasks();

    if (window.electronAPI?.onTaskChanged) {
      const unsubscribe = window.electronAPI.onTaskChanged(() => {
        loadTasks();
      });
      return () => unsubscribe();
    }
  }, []);

  const handleOpenAddTask = () => {
    if (window.electronAPI?.openAddTaskWindow) {
      window.electronAPI.openAddTaskWindow();
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '28px',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '16px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px' }}>
            TaskFlow Pro
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Desktop Productivity & Task Management
          </p>
        </div>
        <button
          onClick={handleOpenAddTask}
          style={{
            backgroundColor: 'var(--accent-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
            transition: 'background 0.2s ease',
          }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-primary-hover)')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-primary)')}
        >
          + Add New Task
        </button>
      </header>

      {/* Main Container */}
      <main>
        <div
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '40px 20px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>📋</div>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
            {loading ? 'Loading tasks...' : tasks.length === 0 ? 'No tasks yet' : `${tasks.length} Task(s)`}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '420px', margin: '0 auto' }}>
            Use the "Add New Task" button above to launch the standalone task creation window.
          </p>
        </div>
      </main>
    </div>
  );
}
