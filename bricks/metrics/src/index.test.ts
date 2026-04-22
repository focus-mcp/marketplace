// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { metCosts, metDuration, metSession, metTokens, resetMetrics } from './operations.ts';

beforeEach(() => {
    resetMetrics();
});

afterEach(() => {
    resetMetrics();
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
        // Inject tool calls directly via metTokens then patch duration via the store
        // We test by recording tokens — duration is 0 by default from metTokens
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
        expect(bus.handle).toHaveBeenCalledWith('metrics:session', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('metrics:tokens', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('metrics:costs', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('metrics:duration', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubbers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
