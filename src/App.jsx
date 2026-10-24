import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard.jsx';
import TaskForm from './components/TaskForm.jsx';

/**
 * Root Application Router based on window hash.
 * Loads TaskForm in the standalone Add Task window (#/add-task)
 * or the full TaskFlow Pro Dashboard for the main window.
 */
export default function App() {
  const [currentHash, setCurrentHash] = useState(window.location.hash || '#/dashboard');

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash || '#/dashboard');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (currentHash === '#/add-task') {
    return (
      <div style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
        <TaskForm />
      </div>
    );
  }

  return <Dashboard />;
}
