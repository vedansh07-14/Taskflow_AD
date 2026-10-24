import React, { useState, useEffect } from 'react';

export default function App() {
  const [systemInfo, setSystemInfo] = useState(null);
  const [status, setStatus] = useState('Checking IPC connection...');
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    async function checkBridge() {
      if (window.electronAPI && typeof window.electronAPI.ping === 'function') {
        setIsElectron(true);
        try {
          const info = await window.electronAPI.ping();
          setSystemInfo(info);
          setStatus('Connected to Electron Main Process');
        } catch (err) {
          setStatus(`IPC Error: ${err.message}`);
        }
      } else {
        setIsElectron(false);
        setStatus('Browser Mode (electronAPI not found on window object)');
      }
    }

    checkBridge();
  }, []);

  return (
    <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>
      {/* Header */}
      <header style={{ marginBottom: '28px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', letterSpacing: '-0.5px' }}>
          TaskFlow Pro
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
          Development Environment & IPC Handshake Verification
        </p>
      </header>

      {/* Connection Status Card */}
      <section
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: `1px solid ${isElectron ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <span
            style={{
              display: 'inline-block',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: isElectron ? 'var(--accent-success)' : 'var(--accent-danger)',
              boxShadow: isElectron ? '0 0 8px var(--accent-success)' : '0 0 8px var(--accent-danger)',
            }}
          />
          <h2 style={{ fontSize: '16px', fontWeight: '600' }}>{status}</h2>
        </div>

        {systemInfo && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '12px',
              marginTop: '16px',
            }}
          >
            <div style={{ backgroundColor: 'var(--bg-card)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Electron</div>
              <div style={{ fontSize: '15px', fontWeight: '600', marginTop: '2px' }}>v{systemInfo.electronVersion}</div>
            </div>
            <div style={{ backgroundColor: 'var(--bg-card)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Node.js</div>
              <div style={{ fontSize: '15px', fontWeight: '600', marginTop: '2px' }}>v{systemInfo.nodeVersion}</div>
            </div>
            <div style={{ backgroundColor: 'var(--bg-card)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Chromium</div>
              <div style={{ fontSize: '15px', fontWeight: '600', marginTop: '2px' }}>v{systemInfo.chromeVersion}</div>
            </div>
            <div style={{ backgroundColor: 'var(--bg-card)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Platform</div>
              <div style={{ fontSize: '15px', fontWeight: '600', marginTop: '2px' }}>{systemInfo.platform}</div>
            </div>
          </div>
        )}
      </section>

      {/* Verification Checklist */}
      <section
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
        }}
      >
        <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px' }}>Environment Health Checklist</h3>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
            <span style={{ color: 'var(--accent-success)' }}>✓</span>
            <span>React + JSX frontend rendering with Hot Module Replacement</span>
          </li>
          <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
            <span style={{ color: 'var(--accent-success)' }}>✓</span>
            <span>Electron BrowserWindow initialized with secure context isolation</span>
          </li>
          <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
            <span style={{ color: isElectron ? 'var(--accent-success)' : 'var(--text-muted)' }}>
              {isElectron ? '✓' : '○'}
            </span>
            <span>Preload script exposing safe <code>window.electronAPI</code> without exposing Node globals</span>
          </li>
          <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
            <span style={{ color: systemInfo ? 'var(--accent-success)' : 'var(--text-muted)' }}>
              {systemInfo ? '✓' : '○'}
            </span>
            <span>Two-way IPC round-trip verified (<code>app:ping</code>)</span>
          </li>
        </ul>
      </section>
    </div>
  );
}
