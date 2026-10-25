const { describe, it } = require('node:test');
const assert = require('node:assert');
const { validateIpcSender } = require('../electron/ipcHandlers.cjs');
const notifications = require('../electron/notifications.cjs');

describe('Security & Native Diagnostics Verification', () => {
  it('TC-AUTO-07: Validates and rejects unauthorized or malformed IPC senders', () => {
    assert.strictEqual(validateIpcSender(null), false);
    assert.strictEqual(validateIpcSender({}), false);
    assert.strictEqual(validateIpcSender({ sender: null }), false);
    assert.strictEqual(validateIpcSender({ sender: {} }), false);
  });

  it('TC-AUTO-08: Enforces required notification message templates strictly', () => {
    assert.strictEqual(
      notifications.NOTIFICATION_TEMPLATES.task_created.body,
      'Your task has been created successfully.'
    );
    assert.strictEqual(
      notifications.NOTIFICATION_TEMPLATES.task_completed.body,
      'Your task has been marked as completed.'
    );
  });

  it('TC-AUTO-09: Handles unsupported notification environments gracefully', () => {
    const res = notifications.showNotification({ type: 'task_completed' });
    assert.strictEqual(res.shown, false);
    assert.strictEqual(res.reason, 'unsupported');
  });
});
