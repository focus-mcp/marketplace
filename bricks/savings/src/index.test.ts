// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetSavings, savCompare, savReport, savRoi, savTrend } from './operations.ts';

beforeEach(() => {
    resetSavings();
});

afterEach(() => {
    resetSavings();
});

// ─── savReport ────────────────────────────────────────────────────────────────

describe('savReport', () => {
    it('records a session and returns correct savings', () => {
        const result = savReport({ baselineTokens: 1000, actualTokens: 200 });
        expect(result.sessionId).toBeTruthy();
        expect(result.saved).toBe(800);
        expect(result.percentage).toBeCloseTo(80);
        expect(result.factor).toBeCloseTo(5);
    });

    it('handles zero baseline gracefully', () => {
        const result = savReport({ baselineTokens: 0, actualTokens: 0 });
        expect(result.percentage).toBe(0);
        expect(result.saved).toBe(0);
    });

    it('accepts optional duration', () => {
        const result = savReport({ baselineTokens: 500, actualTokens: 100, duration: 3000 });
        expect(result.sessionId).toBeTruthy();
        expect(result.saved).toBe(400);
    });

    it('assigns unique sessionIds across multiple calls', () => {
        const a = savReport({ baselineTokens: 100, actualTokens: 50 });
        const b = savReport({ baselineTokens: 100, actualTokens: 50 });
        expect(a.sessionId).not.toBe(b.sessionId);
    });
});

// ─── savCompare ───────────────────────────────────────────────────────────────

describe('savCompare', () => {
    it('identifies the better session', () => {
        const a = savReport({ baselineTokens: 1000, actualTokens: 200 }); // 80%
        const b = savReport({ baselineTokens: 1000, actualTokens: 500 }); // 50%
        const result = savCompare({ sessionA: a.sessionId, sessionB: b.sessionId });
        expect(result.better).toBe(a.sessionId);
        expect(result.improvement).toBeCloseTo(30);
    });

    it('returns correct details for both sessions', () => {
        const a = savReport({ baselineTokens: 500, actualTokens: 250 });
        const b = savReport({ baselineTokens: 800, actualTokens: 400 });
        const result = savCompare({ sessionA: a.sessionId, sessionB: b.sessionId });
        expect(result.details.a.id).toBe(a.sessionId);
        expect(result.details.b.id).toBe(b.sessionId);
        expect(result.details.a.percentage).toBeCloseTo(50);
        expect(result.details.b.percentage).toBeCloseTo(50);
    });

    it('throws when session not found', () => {
        expect(() => savCompare({ sessionA: 'nonexistent', sessionB: 'also-missing' })).toThrow();
    });

    it('handles equal sessions with no improvement', () => {
        const a = savReport({ baselineTokens: 100, actualTokens: 50 });
        const b = savReport({ baselineTokens: 100, actualTokens: 50 });
        const result = savCompare({ sessionA: a.sessionId, sessionB: b.sessionId });
        expect(result.improvement).toBeCloseTo(0);
    });
});

// ─── savTrend ─────────────────────────────────────────────────────────────────

describe('savTrend', () => {
    it('returns empty state when no sessions exist', () => {
        const result = savTrend({});
        expect(result.sessions).toHaveLength(0);
        expect(result.avgSavingsPercent).toBe(0);
        expect(result.trend).toBe('stable');
    });

    it('computes average savings percent across sessions', () => {
        savReport({ baselineTokens: 1000, actualTokens: 200 }); // 80%
        savReport({ baselineTokens: 1000, actualTokens: 400 }); // 60%
        const result = savTrend({});
        expect(result.avgSavingsPercent).toBeCloseTo(70);
    });

    it('respects the last parameter', () => {
        savReport({ baselineTokens: 100, actualTokens: 50 });
        savReport({ baselineTokens: 100, actualTokens: 50 });
        savReport({ baselineTokens: 100, actualTokens: 50 });
        const result = savTrend({ last: 2 });
        expect(result.sessions).toHaveLength(2);
    });

    it('detects improving trend', () => {
        savReport({ baselineTokens: 1000, actualTokens: 900 }); // 10%
        savReport({ baselineTokens: 1000, actualTokens: 800 }); // 20%
        savReport({ baselineTokens: 1000, actualTokens: 600 }); // 40%
        savReport({ baselineTokens: 1000, actualTokens: 100 }); // 90%
        const result = savTrend({});
        expect(result.trend).toBe('improving');
    });

    it('detects declining trend', () => {
        savReport({ baselineTokens: 1000, actualTokens: 100 }); // 90%
        savReport({ baselineTokens: 1000, actualTokens: 600 }); // 40%
        savReport({ baselineTokens: 1000, actualTokens: 800 }); // 20%
        savReport({ baselineTokens: 1000, actualTokens: 900 }); // 10%
        const result = savTrend({});
        expect(result.trend).toBe('declining');
    });
});

// ─── savRoi ───────────────────────────────────────────────────────────────────

describe('savRoi', () => {
    it('returns zero benefit when no sessions recorded', () => {
        const result = savRoi({});
        expect(result.tokensSaved).toBe(0);
        expect(result.costSaved).toBe(0);
        expect(result.netBenefit).toBe(0);
    });

    it('calculates cost saved with default rate', () => {
        savReport({ baselineTokens: 1000, actualTokens: 0 }); // 1000 tokens saved
        const result = savRoi({});
        expect(result.tokensSaved).toBe(1000);
        expect(result.costSaved).toBeCloseTo(0.003);
    });

    it('uses custom costPerToken', () => {
        savReport({ baselineTokens: 1000, actualTokens: 500 }); // 500 tokens saved
        const result = savRoi({ costPerToken: 0.01 });
        expect(result.costSaved).toBeCloseTo(5);
    });

    it('accounts for overhead across all sessions', () => {
        savReport({ baselineTokens: 1000, actualTokens: 500 });
        savReport({ baselineTokens: 1000, actualTokens: 500 });
        const result = savRoi({ overheadMs: 100 });
        expect(result.timeOverhead).toBe(200); // 2 sessions x 100ms
    });
});

// ─── brick integration ────────────────────────────────────────────────────────

describe('savings brick', () => {
    it('registers 4 handlers on start and unregisters on stop', async () => {
        const { default: brick } = await import('./index.ts');
        const unsubbers: Array<ReturnType<typeof vi.fn>> = [];
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
        expect(bus.handle).toHaveBeenCalledWith('savings:report', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('savings:compare', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('savings:trend', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('savings:roi', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubbers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
