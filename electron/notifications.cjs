const { app, Notification, BrowserWindow } = require('electron');

/**
 * Predefined safe notification templates to prevent renderer abuse.
 * Strict message content satisfying application requirements.
 */
const NOTIFICATION_TEMPLATES = {
  task_created: {
    title: 'TaskFlow Pro',
    body: 'Your task has been created successfully.',
  },
  task_completed: {
    title: 'TaskFlow Pro',
    body: 'Your task has been marked as completed.',
  },
};

// Set to retain references preventing V8 garbage collection before the OS banner closes
const activeNotifications = new Set();

/**
 * Inspects and logs macOS development runtime environment details.
 */
function logEnvironmentDiagnostics() {
  const isMac = process.platform === 'darwin';
  const isPackaged = app ? app.isPackaged : false;

  if (isMac && !isPackaged) {
    console.log(
      '[Notifications Diagnostic] Running in macOS development mode (unpackaged).\n' +
      '  - macOS Notification Center maps dev notifications to bundle ID "com.github.Electron".\n' +
      '  - Notification delivery requires ad-hoc code-signing on node_modules/electron/dist/Electron.app.\n' +
      '  - If notifications are silenced, verify macOS System Settings > Notifications > Electron is set to "Allow Notifications".'
    );
  }
}

// Log diagnostics once at startup
try {
  logEnvironmentDiagnostics();
} catch (diagErr) {
  // Silent fallback in test environments
}

/**
 * Validates and displays a native operating system notification.
 *
 * @param {Object} payload
 * @param {'task_created'|'task_completed'|'custom'} [payload.type='task_created'] - Allowed type
 * @param {string} [payload.taskTitle] - Optional title of the completed task
 * @param {string} [payload.title] - Optional title override (strictly sanitized)
 * @param {string} [payload.body] - Optional body override (strictly sanitized)
 * @returns {{ shown: boolean, title?: string, body?: string, reason?: string }}
 */
function showNotification(payload = {}) {
  // 1. Guard against platforms or headless test environments where Notification is unsupported
  if (!Notification || typeof Notification.isSupported !== 'function' || !Notification.isSupported()) {
    console.warn('[Notifications] Native desktop notifications are not supported in this runtime environment.');
    return { shown: false, reason: 'unsupported' };
  }

  const { type = 'task_created', taskTitle, title, body } = payload;

  let resolvedTitle = 'TaskFlow Pro';
  let resolvedBody = '';

  // 2. Resolve predefined safe notification types
  if (type === 'task_created') {
    resolvedTitle = NOTIFICATION_TEMPLATES.task_created.title;
    resolvedBody = NOTIFICATION_TEMPLATES.task_created.body;
  } else if (type === 'task_completed') {
    resolvedTitle = NOTIFICATION_TEMPLATES.task_completed.title;
    if (typeof body === 'string' && body.trim()) {
      resolvedBody = body.trim().slice(0, 300);
    } else if (taskTitle && typeof taskTitle === 'string') {
      resolvedBody = `Task "${taskTitle.slice(0, 100).trim()}" has been marked as completed.`;
    } else {
      resolvedBody = NOTIFICATION_TEMPLATES.task_completed.body;
    }
  } else if (type === 'custom') {
    // Strict sanitization for custom notification messages
    if (typeof title === 'string' && title.trim()) {
      resolvedTitle = title.trim().slice(0, 100);
    }
    if (typeof body === 'string' && body.trim()) {
      resolvedBody = body.trim().slice(0, 300);
    } else {
      resolvedBody = 'Notification from TaskFlow Pro';
    }
  } else {
    console.warn(`[Notifications] Unknown notification type "${type}". Falling back to task_created.`);
    resolvedTitle = NOTIFICATION_TEMPLATES.task_created.title;
    resolvedBody = NOTIFICATION_TEMPLATES.task_created.body;
  }

  try {
    const notification = new Notification({
      title: resolvedTitle,
      body: resolvedBody,
      silent: false, // Standard system audio cue
    });

    // Retain reference until notification lifecycle ends
    activeNotifications.add(notification);
    const cleanup = () => activeNotifications.delete(notification);

    notification.once('close', cleanup);

    // Capture actionable OS-level notification failure
    notification.once('failed', (event, error) => {
      cleanup();
      console.error(
        '[Notifications] Native notification failed to display at OS level:',
        error || event || 'Unknown OS rejection'
      );
    });

    // Clicking notification focuses the main application window
    notification.on('click', () => {
      cleanup();
      if (BrowserWindow) {
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0 && !windows[0].isDestroyed()) {
          if (windows[0].isMinimized()) windows[0].restore();
          windows[0].focus();
        }
      }
    });

    notification.show();
    console.log(`[Notifications] Native notification dispatched: [${resolvedTitle}] ${resolvedBody}`);
    return { shown: true, title: resolvedTitle, body: resolvedBody };
  } catch (err) {
    console.error('[Notifications] Failed to instantiate native notification:', err);
    return { shown: false, reason: err.message };
  }
}

module.exports = {
  showNotification,
  NOTIFICATION_TEMPLATES,
};
