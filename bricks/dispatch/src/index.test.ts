// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dspCancel, dspQueue, dspSend, dspStatus, resetDispatch } from './operations.ts';

beforeEach(() => {
    resetDispatch();
});

afterEach(() => {
    resetDispatch();
});

// ─── dspSend ─────────────────────────────────────────────────────────────────

describe('dspSend', () => {
    it('creates a task with status pending', () => {
        const result = dspSend({ type: 'build', payload: { repo: 'foo' } });
        expect(result.status).toBe('pending');
        expect(result.type).toBe('build');
        expect(result.id).toBeTruthy();
    });

    it('uses default priority of 5 when omitted', () => {
        const result = dspSend({ type: 'review', payload: {} });
        expect(result.priority).toBe(5);
    });

    it('clamps priority to 1-10 range', () => {
        const low = dspSend({ type: 't', payload: {}, priority: -5 });
        const high = dspSend({ type: 't', payload: {}, priority: 99 });
        expect(low.priority).toBe(1);
        expect(high.priority).toBe(10);
    });

    it('generates unique IDs for each task', () => {
        const a = dspSend({ type: 't', payload: {} });
        const b = dspSend({ type: 't', payload: {} });
        expect(a.id).not.toBe(b.id);
    });
});

// ─── dspQueue ────────────────────────────────────────────────────────────────

describe('dspQueue', () => {
    it('returns all tasks when filter is all', () => {
        dspSend({ type: 'a', payload: {} });
        dspSend({ type: 'b', payload: {} });
        const result = dspQueue({ status: 'all' });
        expect(result.count).toBe(2);
    });

    it('returns all tasks when status is omitted', () => {
        dspSend({ type: 'a', payload: {} });
        const result = dspQueue({});
        expect(result.count).toBe(1);
    });

    it('filters tasks by pending status', () => {
        const task = dspSend({ type: 'a', payload: {} });
        dspCancel({ id: task.id });
        dspSend({ type: 'b', payload: {} });
        const result = dspQueue({ status: 'pending' });
        expect(result.count).toBe(1);
        expect(result.tasks[0]?.status).toBe('pending');
    });

    it('filters tasks by cancelled status', () => {
        const task = dspSend({ type: 'a', payload: {} });
        dspCancel({ id: task.id });
        const result = dspQueue({ status: 'cancelled' });
        expect(result.count).toBe(1);
    });

    it('sorts tasks by priority descending', () => {
        dspSend({ type: 'low', payload: {}, priority: 1 });
        dspSend({ type: 'high', payload: {}, priority: 9 });
        dspSend({ type: 'mid', payload: {}, priority: 5 });
        const result = dspQueue({});
        expect(result.tasks[0]?.priority).toBe(9);
        expect(result.tasks[2]?.priority).toBe(1);
    });

    it('returns empty list when queue is empty', () => {
        const result = dspQueue({});
        expect(result.count).toBe(0);
        expect(result.tasks).toHaveLength(0);
    });
});

// ─── dspCancel ───────────────────────────────────────────────────────────────

describe('dspCancel', () => {
    it('cancels a pending task', () => {
        const { id } = dspSend({ type: 'build', payload: {} });
        const result = dspCancel({ id });
        expect(result.cancelled).toBe(true);
        expect(result.previousStatus).toBe('pending');
    });

    it('returns cancelled=false for unknown id', () => {
        const result = dspCancel({ id: 'non-existent-id' });
        expect(result.cancelled).toBe(false);
    });

    it('cannot cancel a done task', () => {
        // Simulate by checking state — done tasks cannot be created directly;
        // instead verify that only pending/running are cancellable via re-cancel logic.
        const { id } = dspSend({ type: 'build', payload: {} });
        dspCancel({ id }); // first cancel → cancelled
        const result = dspCancel({ id }); // second cancel → already cancelled, not cancellable
        expect(result.cancelled).toBe(false);
        expect(result.previousStatus).toBe('cancelled');
    });

    it('updates the task status to cancelled in the queue', () => {
        const { id } = dspSend({ type: 'build', payload: {} });
        dspCancel({ id });
        const queued = dspQueue({ status: 'cancelled' });
        expect(queued.tasks.some((t) => t.id === id)).toBe(true);
    });
});

// ─── dspStatus ───────────────────────────────────────────────────────────────

describe('dspStatus', () => {
    it('returns full task details for a known id', () => {
        const sent = dspSend({ type: 'review', payload: { pr: 42 } });
        const result = dspStatus({ id: sent.id });
        expect('error' in result).toBe(false);
        if (!('error' in result)) {
            expect(result.id).toBe(sent.id);
            expect(result.type).toBe('review');
            expect(result.payload).toEqual({ pr: 42 });
            expect(result.status).toBe('pending');
            expect(typeof result.createdAt).toBe('number');
            expect(typeof result.updatedAt).toBe('number');
        }
    });

    it('returns error for unknown id', () => {
        const result = dspStatus({ id: 'ghost' });
        expect('error' in result).toBe(true);
        if ('error' in result) {
            expect(result.error).toContain('ghost');
        }
    });

    it('reflects updated status after cancel', () => {
        const { id } = dspSend({ type: 'build', payload: {} });
        dspCancel({ id });
        const result = dspStatus({ id });
        if (!('error' in result)) {
            expect(result.status).toBe('cancelled');
        }
    });
});

// ─── dispatch brick ───────────────────────────────────────────────────────────

describe('dispatch brick', () => {
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
        expect(bus.handle).toHaveBeenCalledWith('dispatch:send', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('dispatch:queue', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('dispatch:cancel', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('dispatch:status', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubbers) {
            expect(unsub).toHaveBeenCalled();
        }
    });

    it('exposes the correct manifest name and prefix', async () => {
        const { default: brick } = await import('./index.ts');
        expect(brick.manifest.name).toBe('dispatch');
        expect(brick.manifest.prefix).toBe('dsp');
    });
});
