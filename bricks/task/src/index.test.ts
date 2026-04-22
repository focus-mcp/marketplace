// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetTasks, tskAssign, tskComplete, tskCreate, tskStatus } from './operations.ts';

beforeEach(() => {
    resetTasks();
});

afterEach(() => {
    resetTasks();
});

// ─── tskCreate ───────────────────────────────────────────────────────────────

describe('tskCreate', () => {
    it('creates a task with required fields and returns id/title/priority/status', () => {
        const result = tskCreate({ title: 'Analyze logs', description: 'Read server logs' });
        expect(result.id).toMatch(/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/);
        expect(result.title).toBe('Analyze logs');
        expect(result.priority).toBe(5);
        expect(result.status).toBe('pending');
    });

    it('respects a custom priority', () => {
        const result = tskCreate({ title: 'Urgent', description: 'Do it now', priority: 1 });
        expect(result.priority).toBe(1);
    });

    it('creates multiple tasks with distinct IDs', () => {
        const a = tskCreate({ title: 'A', description: 'desc A' });
        const b = tskCreate({ title: 'B', description: 'desc B' });
        expect(a.id).not.toBe(b.id);
    });
});

// ─── tskAssign ───────────────────────────────────────────────────────────────

describe('tskAssign', () => {
    it('assigns a task to an agent and sets status to assigned', () => {
        const { id } = tskCreate({ title: 'Task', description: 'desc' });
        const result = tskAssign({ id, agentId: 'agent-42' });
        expect(result.id).toBe(id);
        expect(result.assignedTo).toBe('agent-42');
        expect(result.status).toBe('assigned');
    });

    it('throws when task ID does not exist', () => {
        expect(() => tskAssign({ id: 'non-existent', agentId: 'agent-1' })).toThrow(
            'Task not found: non-existent',
        );
    });
});

// ─── tskStatus ───────────────────────────────────────────────────────────────

describe('tskStatus', () => {
    it('returns a single task by ID', () => {
        const { id } = tskCreate({ title: 'Single', description: 'desc' });
        const result = tskStatus({ id });
        expect(result).toMatchObject({ id, title: 'Single', status: 'pending' });
    });

    it('throws when task ID not found', () => {
        expect(() => tskStatus({ id: 'missing' })).toThrow('Task not found: missing');
    });

    it('filters tasks by status', () => {
        tskCreate({ title: 'A', description: 'desc A' });
        const { id: idB } = tskCreate({ title: 'B', description: 'desc B' });
        tskAssign({ id: idB, agentId: 'agent-1' });

        const result = tskStatus({ status: 'assigned' });
        expect('tasks' in result).toBe(true);
        if ('tasks' in result) {
            expect(result.count).toBe(1);
            expect(result.tasks[0]?.id).toBe(idB);
        }
    });

    it('returns all tasks when no filter provided', () => {
        tskCreate({ title: 'A', description: 'desc' });
        tskCreate({ title: 'B', description: 'desc' });

        const result = tskStatus({});
        expect('tasks' in result).toBe(true);
        if ('tasks' in result) {
            expect(result.count).toBe(2);
        }
    });

    it('returns empty list when no tasks match the status filter', () => {
        tskCreate({ title: 'A', description: 'desc' });

        const result = tskStatus({ status: 'done' });
        expect('tasks' in result).toBe(true);
        if ('tasks' in result) {
            expect(result.count).toBe(0);
        }
    });
});

// ─── tskComplete ─────────────────────────────────────────────────────────────

describe('tskComplete', () => {
    it('marks a task as done and stores result', () => {
        const { id } = tskCreate({ title: 'Task', description: 'desc' });
        const result = tskComplete({ id, result: 'Done: 42 items processed' });
        expect(result.id).toBe(id);
        expect(result.status).toBe('done');
        expect(result.result).toBe('Done: 42 items processed');
    });

    it('marks done without a result', () => {
        const { id } = tskCreate({ title: 'Task', description: 'desc' });
        const result = tskComplete({ id });
        expect(result.status).toBe('done');
        expect(result.result).toBeUndefined();
    });

    it('throws when task ID does not exist', () => {
        expect(() => tskComplete({ id: 'ghost' })).toThrow('Task not found: ghost');
    });
});

// ─── task brick integration ───────────────────────────────────────────────────

describe('task brick', () => {
    it('registers 4 handlers on start and unregisters on stop', async () => {
        const { default: brick } = await import('./index.ts');
        const unsubbers: Array<() => void> = [];
        const bus = {
            handle: vi.fn(() => {
                const unsub = vi.fn();
                unsubbers.push(unsub);
                return unsub;
            }),
            on: vi.fn(),
        };

        await brick.start({ bus });
        expect(bus.handle).toHaveBeenCalledTimes(4);
        expect(bus.handle).toHaveBeenCalledWith('task:create', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('task:assign', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('task:status', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('task:complete', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubbers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
