// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    listeners,
    resetShare,
    shrBroadcast,
    shrContext,
    shrFiles,
    shrResults,
} from './operations.ts';

beforeEach(() => {
    resetShare();
});

afterEach(() => {
    resetShare();
});

// ─── shrContext ───────────────────────────────────────────────────────────────

describe('shrContext', () => {
    it('sets and returns the value', () => {
        const result = shrContext({ key: 'env', value: 'production' });
        expect(result.set).toBe(true);
        expect(result.key).toBe('env');
        expect(result.value).toBe('production');
    });

    it('reads without setting when no value provided', () => {
        shrContext({ key: 'foo', value: 42 });
        const result = shrContext({ key: 'foo' });
        expect(result.set).toBe(false);
        expect(result.value).toBe(42);
    });

    it('returns undefined for unknown key', () => {
        const result = shrContext({ key: 'missing' });
        expect(result.set).toBe(false);
        expect(result.value).toBeUndefined();
    });

    it('overwrites existing value', () => {
        shrContext({ key: 'x', value: 1 });
        const result = shrContext({ key: 'x', value: 2 });
        expect(result.value).toBe(2);
    });

    it('stores null as a value (explicit set)', () => {
        const result = shrContext({ key: 'nullkey', value: null });
        expect(result.set).toBe(true);
        expect(result.value).toBeNull();
    });
});

// ─── shrFiles ────────────────────────────────────────────────────────────────

describe('shrFiles', () => {
    it('registers files for an agent', () => {
        const result = shrFiles({ agentId: 'agent-1', files: ['/a.ts', '/b.ts'] });
        expect(result.agentId).toBe('agent-1');
        expect(result.files).toEqual(['/a.ts', '/b.ts']);
        expect(result.count).toBe(2);
    });

    it('merges files on subsequent calls', () => {
        shrFiles({ agentId: 'agent-1', files: ['/a.ts'] });
        const result = shrFiles({ agentId: 'agent-1', files: ['/b.ts'] });
        expect(result.files).toContain('/a.ts');
        expect(result.files).toContain('/b.ts');
        expect(result.count).toBe(2);
    });

    it('deduplicates files', () => {
        shrFiles({ agentId: 'agent-1', files: ['/a.ts'] });
        const result = shrFiles({ agentId: 'agent-1', files: ['/a.ts'] });
        expect(result.count).toBe(1);
    });

    it('lists files when no files provided', () => {
        shrFiles({ agentId: 'agent-2', files: ['/x.ts'] });
        const result = shrFiles({ agentId: 'agent-2' });
        expect(result.files).toEqual(['/x.ts']);
        expect(result.count).toBe(1);
    });

    it('returns empty for unknown agent', () => {
        const result = shrFiles({ agentId: 'ghost' });
        expect(result.files).toEqual([]);
        expect(result.count).toBe(0);
    });
});

// ─── shrResults ───────────────────────────────────────────────────────────────

describe('shrResults', () => {
    it('stores and retrieves a result', () => {
        const result = shrResults({ taskId: 'task-1', result: { ok: true } });
        expect(result.stored).toBe(true);
        expect(result.taskId).toBe('task-1');
        expect(result.result).toEqual({ ok: true });
    });

    it('retrieves without storing when no result provided', () => {
        shrResults({ taskId: 'task-2', result: 'done' });
        const result = shrResults({ taskId: 'task-2' });
        expect(result.stored).toBe(false);
        expect(result.result).toBe('done');
    });

    it('returns undefined for unknown task', () => {
        const result = shrResults({ taskId: 'unknown' });
        expect(result.stored).toBe(false);
        expect(result.result).toBeUndefined();
    });

    it('overwrites existing result', () => {
        shrResults({ taskId: 'task-3', result: 'v1' });
        const result = shrResults({ taskId: 'task-3', result: 'v2' });
        expect(result.result).toBe('v2');
    });
});

// ─── shrBroadcast ─────────────────────────────────────────────────────────────

describe('shrBroadcast', () => {
    it('returns delivered count 0 when no listeners', () => {
        const result = shrBroadcast({ message: 'hello', from: 'agent-a' });
        expect(result.delivered).toBe(0);
        expect(result.message).toBe('hello');
        expect(typeof result.timestamp).toBe('string');
    });

    it('delivers to all listeners and returns correct count', () => {
        const received: string[] = [];
        listeners.push({ id: 'l1', callback: (e) => received.push(e.message) });
        listeners.push({ id: 'l2', callback: (e) => received.push(e.message) });

        const result = shrBroadcast({ message: 'ping', from: 'orchestrator' });
        expect(result.delivered).toBe(2);
        expect(received).toEqual(['ping', 'ping']);
    });

    it('timestamp is a valid ISO string', () => {
        const result = shrBroadcast({ message: 'ts-check', from: 'bot' });
        expect(() => new Date(result.timestamp)).not.toThrow();
        expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });

    it('passes from field to listener callback', () => {
        const entries: string[] = [];
        listeners.push({ id: 'l3', callback: (e) => entries.push(e.from) });

        shrBroadcast({ message: 'msg', from: 'agent-x' });
        expect(entries).toEqual(['agent-x']);
    });
});

// ─── resetShare ──────────────────────────────────────────────────────────────

describe('resetShare', () => {
    it('clears all state', () => {
        shrContext({ key: 'k', value: 1 });
        shrFiles({ agentId: 'a', files: ['/f.ts'] });
        shrResults({ taskId: 't', result: 'r' });
        listeners.push({ id: 'x', callback: () => {} });

        resetShare();

        expect(shrContext({ key: 'k' }).value).toBeUndefined();
        expect(shrFiles({ agentId: 'a' }).count).toBe(0);
        expect(shrResults({ taskId: 't' }).result).toBeUndefined();
        expect(listeners).toHaveLength(0);
    });
});

// ─── share brick ─────────────────────────────────────────────────────────────

describe('share brick', () => {
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
        expect(bus.handle).toHaveBeenCalledWith('share:context', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('share:files', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('share:results', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('share:broadcast', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubbers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
