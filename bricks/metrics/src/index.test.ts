// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    flushPending,
    metBatch,
    metCosts,
    metDuration,
    metSession,
    metTokens,
    resetMetrics,
} from './operations.ts';

beforeEach(() => {
    resetMetrics();
    flushPending();
});

afterEach(() => {
    resetMetrics();
    flushPending();
});

// ─── metSession ───────────────────────────────────────────────────────────────

describe('metSession', () => {
    it('returns empty session when no calls recorded', () => {
        const result = metSession({});

        expect(result.toolCalls).toBe(0);
        expect(result.totalTokens).toBe(0);
        expect(result.totalDuration).toBe(0);
        expect(result.startedAt).toBeGreaterThan(0);
    });

    it('returns accumulated totals after recording tokens', () => {
        metTokens({ tool: 'search', inputTokens: 100, outputTokens: 50 });
        metTokens({ tool: 'read', inputTokens: 200, outputTokens: 80 });

        const result = metSession({});

        expect(result.toolCalls).toBe(2);
        expect(result.totalInputTokens).toBe(300);
        expect(result.totalOutputTokens).toBe(130);
        expect(result.totalTokens).toBe(430);
    });

    it('resets session when reset is true', () => {
        metTokens({ tool: 'search', inputTokens: 100, outputTokens: 50 });

        const result = metSession({ reset: true });

        expect(result.toolCalls).toBe(0);
        expect(result.totalTokens).toBe(0);
    });

    it('does not reset when reset is false', () => {
        metTokens({ tool: 'search', inputTokens: 100, outputTokens: 50 });

        const result = metSession({ reset: false });

        expect(result.toolCalls).toBe(1);
    });
});

// ─── metTokens ────────────────────────────────────────────────────────────────

describe('metTokens', () => {
    it('records a tool call and returns totals', () => {
        const result = metTokens({ tool: 'search', inputTokens: 100, outputTokens: 50 });

        expect(result.recorded).toBe(true);
        expect(result.total.inputTokens).toBe(100);
        expect(result.total.outputTokens).toBe(50);
        expect(result.total.tokens).toBe(150);
    });

    it('accumulates totals across multiple calls', () => {
        metTokens({ tool: 'search', inputTokens: 100, outputTokens: 50 });
        const result = metTokens({ tool: 'read', inputTokens: 200, outputTokens: 80 });

        expect(result.total.inputTokens).toBe(300);
        expect(result.total.outputTokens).toBe(130);
        expect(result.total.tokens).toBe(430);
    });

    it('records calls with zero tokens', () => {
        const result = metTokens({ tool: 'ping', inputTokens: 0, outputTokens: 0 });

        expect(result.recorded).toBe(true);
        expect(result.total.tokens).toBe(0);
    });

    // ─── P0 regression: 21 consecutive calls must NOT incur 21x fsync latency ──

    it('21 consecutive metTokens calls complete in bounded time (no per-call fsync)', () => {
        const CALLS = 21;
        // Measure a single call baseline
        const singleStart = performance.now();
        metTokens({ tool: 'baseline', inputTokens: 10, outputTokens: 5 });
        const singleDuration = performance.now() - singleStart;
        flushPending();
        resetMetrics();

        // Measure 21 calls
        const batchStart = performance.now();
        for (let i = 0; i < CALLS; i++) {
            metTokens({ tool: `t${i}`, inputTokens: 10, outputTokens: 5 });
        }
        flushPending();
        const batchDuration = performance.now() - batchStart;

        // 21 calls must be ≤ 5× a single call (was 21× with fsync per call)
        // Be generous: allow up to 50ms total for 21 in-memory pushes
        expect(batchDuration).toBeLessThan(50);
        // Also check ratio — only meaningful if singleDuration > 0
        if (singleDuration > 0) {
            expect(batchDuration / singleDuration).toBeLessThan(5);
        }
    });
});

// ─── metBatch ─────────────────────────────────────────────────────────────────

describe('metBatch', () => {
    it('records multiple entries in one call', () => {
        const result = metBatch({
            records: [
                { tool: 'search', inputTokens: 100, outputTokens: 50 },
                { tool: 'read', inputTokens: 200, outputTokens: 80 },
                { tool: 'write', inputTokens: 50, outputTokens: 20 },
            ],
        });

        expect(result.recorded).toBe(3);
        expect(result.total.inputTokens).toBe(350);
        expect(result.total.outputTokens).toBe(150);
        expect(result.total.tokens).toBe(500);
    });

    it('returns 0 for empty records array', () => {
        const result = metBatch({ records: [] });

        expect(result.recorded).toBe(0);
        expect(result.total.tokens).toBe(0);
    });

    it('accumulates on top of existing session data', () => {
        metTokens({ tool: 'existing', inputTokens: 100, outputTokens: 50 });
        flushPending();

        const result = metBatch({
            records: [{ tool: 'new', inputTokens: 50, outputTokens: 25 }],
        });

        expect(result.total.inputTokens).toBe(150);
        expect(result.total.outputTokens).toBe(75);
    });
});

// ─── metCosts ─────────────────────────────────────────────────────────────────

describe('metCosts', () => {
    it('returns zero cost when no calls recorded', () => {
        const result = metCosts({});

        expect(result.inputCost).toBe(0);
        expect(result.outputCost).toBe(0);
        expect(result.totalCost).toBe(0);
    });

    it('calculates costs using default prices', () => {
        metTokens({ tool: 'search', inputTokens: 1000, outputTokens: 1000 });

        const result = metCosts({});

        expect(result.inputCost).toBeCloseTo(0.003);
        expect(result.outputCost).toBeCloseTo(0.015);
        expect(result.totalCost).toBeCloseTo(0.018);
    });

    it('calculates costs using custom prices', () => {
        metTokens({ tool: 'search', inputTokens: 2000, outputTokens: 1000 });

        const result = metCosts({ inputPricePer1k: 0.01, outputPricePer1k: 0.02 });

        expect(result.inputCost).toBeCloseTo(0.02);
        expect(result.outputCost).toBeCloseTo(0.02);
        expect(result.totalCost).toBeCloseTo(0.04);
    });

    it('returns token counts alongside costs', () => {
        metTokens({ tool: 'search', inputTokens: 300, outputTokens: 100 });
        metTokens({ tool: 'read', inputTokens: 200, outputTokens: 50 });

        const result = metCosts({});

        expect(result.inputTokens).toBe(500);
        expect(result.outputTokens).toBe(150);
    });
});

// ─── metDuration ──────────────────────────────────────────────────────────────

describe('metDuration', () => {
    it('returns zeros when no calls recorded', () => {
        const result = metDuration({});

        expect(result.avg).toBe(0);
        expect(result.min).toBe(0);
        expect(result.max).toBe(0);
        expect(result.calls).toBe(0);
    });

    it('returns stats for all calls when no filter given', () => {
        metTokens({ tool: 'search', inputTokens: 10, outputTokens: 5 });
        metTokens({ tool: 'read', inputTokens: 10, outputTokens: 5 });

        const result = metDuration({});

        expect(result.calls).toBe(2);
        expect(result.avg).toBe(0);
        expect(result.min).toBe(0);
        expect(result.max).toBe(0);
    });

    it('filters by tool name', () => {
        metTokens({ tool: 'search', inputTokens: 10, outputTokens: 5 });
        metTokens({ tool: 'read', inputTokens: 10, outputTokens: 5 });
        metTokens({ tool: 'search', inputTokens: 10, outputTokens: 5 });

        const result = metDuration({ tool: 'search' });

        expect(result.calls).toBe(2);
    });

    it('returns zeros when filtering by unknown tool', () => {
        metTokens({ tool: 'search', inputTokens: 10, outputTokens: 5 });

        const result = metDuration({ tool: 'unknown' });

        expect(result.calls).toBe(0);
        expect(result.avg).toBe(0);
    });

    it('filters by last N calls', () => {
        metTokens({ tool: 'a', inputTokens: 10, outputTokens: 5 });
        metTokens({ tool: 'b', inputTokens: 10, outputTokens: 5 });
        metTokens({ tool: 'c', inputTokens: 10, outputTokens: 5 });
        metTokens({ tool: 'd', inputTokens: 10, outputTokens: 5 });

        const result = metDuration({ last: 2 });

        expect(result.calls).toBe(2);
    });
});

// ─── brick lifecycle ──────────────────────────────────────────────────────────

describe('metrics brick', () => {
    it('registers 5 handlers on start and unregisters on stop', async () => {
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
        expect(bus.handle).toHaveBeenCalledTimes(5);
        expect(bus.handle).toHaveBeenCalledWith('metrics:session', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('metrics:tokens', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('metrics:costs', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('metrics:duration', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('metrics:batch', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubbers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
