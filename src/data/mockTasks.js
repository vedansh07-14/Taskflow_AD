/**
 * Mock task dataset for frontend development and visual testing.
 * Provides tasks across various statuses, priorities, and due dates.
 */
export const initialMockTasks = [
  {
    id: 'task-1',
    title: 'Finalize Software Architecture Document',
    description: 'Document the multi-process Electron boundaries, IPC protocol, and JSON persistence schema.',
    priority: 'high',
    status: 'completed',
    completed: true,
    dueDate: '2026-10-24',
    createdAt: '2026-10-20T10:00:00.000Z',
    updatedAt: '2026-10-24T16:30:00.000Z',
  },
  {
    id: 'task-2',
    title: 'Implement Dark Theme UI Component Hierarchy',
    description: 'Construct the Sidebar, SummaryCards, FilterBar, and TaskCard components using pure CSS tokens.',
    priority: 'high',
    status: 'in-progress',
    completed: false,
    dueDate: '2026-10-26',
    createdAt: '2026-10-21T14:15:00.000Z',
    updatedAt: '2026-10-24T18:00:00.000Z',
  },
  {
    id: 'task-3',
    title: 'Write IPC Channel Handlers in Main Process',
    description: 'Register task:create, task:get-all, task:update, and task:delete in ipcHandlers.js.',
    priority: 'medium',
    status: 'todo',
    completed: false,
    dueDate: '2026-10-28',
    createdAt: '2026-10-22T09:30:00.000Z',
    updatedAt: '2026-10-22T09:30:00.000Z',
  },
  {
    id: 'task-4',
    title: 'Prepare College Project Slide Deck',
    description: 'Highlight desktop-specific advantages, secure contextBridge, and flat-file persistence.',
    priority: 'low',
    status: 'todo',
    completed: false,
    dueDate: '2026-11-02',
    createdAt: '2026-10-23T11:00:00.000Z',
    updatedAt: '2026-10-23T11:00:00.000Z',
  },
  {
    id: 'task-5',
    title: 'Overdue Project Proposal Review',
    description: 'Review professor feedback on process sandboxing and Electron security boundaries.',
    priority: 'high',
    status: 'todo',
    completed: false,
    dueDate: '2026-10-20', // Intentional past date to test overdue styling
    createdAt: '2026-10-18T08:00:00.000Z',
    updatedAt: '2026-10-18T08:00:00.000Z',
  },
];
