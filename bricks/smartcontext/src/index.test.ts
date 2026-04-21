// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { _resetState, sctxLoad, sctxRefresh, sctxStatus } from './operations.ts';

// ─── Mocked bus ──────────────────────────────────────────────────────────────

function makeBus(overrides: Record<string, unknown> = {}) {
    const defaults: Record<string, unknown> = {
        'overview:project': { name: 'test-project', framework: 'none', language: 'typescript' },
        'tokenbudget:analyze': {
            totalTokens: 100,
            files: [
                { path: 'src/a.ts', tokens: 50, lines: 10 },
                { path: 'src/b.ts', tokens: 30, lines: 5 },
            ],
            top10: [{ path: 'src/a.ts', tokens: 50 }],
        },
        'cache:warmup': { loaded: 1, failed: 0 },
        'tokenbudget:fill': {
            selected: [
                { path: 'src/a.ts', tokens: 50, mode: 'signatures' },
                { path: 'src/b.ts', tokens: 30, mode: 'signatures' },
            ],
            used: 80,
            remaining: 1920,
        },
        'cache:stats': { entries: 2, hits: 3, misses: 1, hitRate: 0.75, totalBytes: 500 },
    };
    const merged = { ...defaults, ...overrides };
    return {
        request: vi.fn(async (target: string) => merged[target] ?? {}),
        handle: vi.fn(() => vi.fn()),
        on: vi.fn(),
    };
}

beforeEach(() => {
    _resetState();
});

// ─── sctxLoad ─────────────────────────────────────────────────────────────────

describe('sctxLoad', () => {
    it('returns context with correct structure', async () => {
        const bus = makeBus();
        const result = await sctxLoad({ task: 'add authentication', dir: '/project' }, bus);
        expect(result.context).toContain('add authentication');
        expect(result.filesIncluded).toBe(2);
        expect(result.tokensUsed).toBe(80);
        expect(result.budget).toBe(2000);
        expect(result.mode).toBe('signatures');
    });

    it('uses provided budget', async () => {
        const bus = makeBus();
        const result = await sctxLoad({ task: 'test', dir: '/project', budget: 500 }, bus);
        expect(result.budget).toBe(500);
    });

    it('calls overview:project with dir', async () => {
        const bus = makeBus();
        await sctxLoad({ task: 'test', dir: '/myproject' }, bus);
        expect(bus.request).toHaveBeenCalledWith('overview:project', { dir: '/myproject' });
    });

    it('calls tokenbudget:analyze with dir', async () => {
        const bus = makeBus();
        await sctxLoad({ task: 'test', dir: '/myproject' }, bus);
        expect(bus.request).toHaveBeenCalledWith(
            'tokenbudget:analyze',
            expect.objectContaining({ dir: '/myproject' }),
        );
    });

    it('calls cache:warmup with top file paths', async () => {
        const bus = makeBus();
        await sctxLoad({ task: 'test', dir: '/project' }, bus);
        expect(bus.request).toHaveBeenCalledWith(
            'cache:warmup',
            expect.objectContaining({ paths: expect.any(Array) }),
        );
    });

    it('calls tokenbudget:fill with budget', async () => {
        const bus = makeBus();
        await sctxLoad({ task: 'test', dir: '/project', budget: 300 }, bus);
        expect(bus.request).toHaveBeenCalledWith(
            'tokenbudget:fill',
            expect.objectContaining({ budget: 300 }),
        );
    });

    it('includes project name in context when available', async () => {
        const bus = makeBus();
        const result = await sctxLoad({ task: 'test', dir: '/project' }, bus);
        expect(result.context).toContain('test-project');
    });

    it('returns empty result when analyze returns invalid data', async () => {
        const bus = makeBus({ 'tokenbudget:analyze': null });
        const result = await sctxLoad({ task: 'test', dir: '/project' }, bus);
        expect(result.filesIncluded).toBe(0);
        expect(result.mode).toBe('empty');
    });

    it('returns empty result when fill returns invalid data', async () => {
        const bus = makeBus({ 'tokenbudget:fill': null });
        const result = await sctxLoad({ task: 'test', dir: '/project' }, bus);
        expect(result.filesIncluded).toBe(0);
    });
});

// ─── sctxRefresh ─────────────────────────────────────────────────────────────

describe('sctxRefresh', () => {
    it('returns refresh stats', async () => {
        const bus = makeBus();
        const result = await sctxRefresh({ dir: '/project' }, bus);
        expect(result.refreshed).toBe(2);
        expect(result.tokensUsed).toBe(80);
        expect(result.changed).toBeGreaterThanOrEqual(0);
    });

    it('uses provided budget', async () => {
        const bus = makeBus();
        await sctxRefresh({ dir: '/project', budget: 500 }, bus);
        expect(bus.request).toHaveBeenCalledWith(
            'tokenbudget:fill',
            expect.objectContaining({ budget: 500 }),
        );
    });

    it('returns zeros when analyze returns invalid data', async () => {
        const bus = makeBus({ 'tokenbudget:analyze': null });
        const result = await sctxRefresh({ dir: '/project' }, bus);
        expect(result.refreshed).toBe(0);
        expect(result.tokensUsed).toBe(0);
    });

    it('calls cache:warmup', async () => {
        const bus = makeBus();
        await sctxRefresh({ dir: '/project' }, bus);
        expect(bus.request).toHaveBeenCalledWith('cache:warmup', expect.any(Object));
    });
});

// ─── sctxStatus ──────────────────────────────────────────────────────────────

describe('sctxStatus', () => {
    it('returns status with cache stats', async () => {
        const bus = makeBus();
        const result = await sctxStatus(bus);
        expect(result.cacheHits).toBe(3);
        expect(result.cacheMisses).toBe(1);
        expect(typeof result.filesLoaded).toBe('number');
        expect(typeof result.tokensUsed).toBe('number');
    });

    it('calls cache:stats', async () => {
        const bus = makeBus();
        await sctxStatus(bus);
        expect(bus.request).toHaveBeenCalledWith('cache:stats', {});
    });

    it('reflects filesLoaded and tokensUsed from previous load', async () => {
        const bus = makeBus();
        await sctxLoad({ task: 'test', dir: '/project' }, bus);
        const status = await sctxStatus(bus);
        expect(status.filesLoaded).toBe(2);
        expect(status.tokensUsed).toBe(80);
    });
});

// ─── smartcontext brick ───────────────────────────────────────────────────────

describe('smartcontext brick', () => {
    it('registers 3 handlers on start and unregisters on stop', async () => {
        const { default: brick } = await import('./index.ts');
        const unsubscribers: Array<() => void> = [];
        const bus = {
            handle: vi.fn(() => {
                const unsub = vi.fn();
                unsubscribers.push(unsub);
                return unsub;
            }),
            on: vi.fn(),
            request: vi.fn(async () => ({})),
        };

        await brick.start({ bus });
        expect(bus.handle).toHaveBeenCalledTimes(3);
        expect(bus.handle).toHaveBeenCalledWith('smartcontext:load', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('smartcontext:refresh', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('smartcontext:status', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubscribers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
