/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { runTool } from '@focus-mcp/marketplace-testing';
import { afterEach, beforeEach, describe, it } from 'vitest';
import brick from '../../src/index.js';
import { flushPending, resetMetrics } from '../../src/operations.js';
import { check as checkMetCostsHappy } from './scenarios/met_costs/happy/invariants.js';
import { check as checkMetDurationHappy } from './scenarios/met_duration/happy/invariants.js';
import { check as checkMetSessionInitial } from './scenarios/met_session/initial/invariants.js';
import { check as checkMetSessionPostReset } from './scenarios/met_session/post-reset/invariants.js';
import { check as checkMetTokensHappy } from './scenarios/met_tokens/happy/invariants.js';

function assertInvariants(results: Array<{ ok: boolean; reason?: string }>): void {
    for (const r of results) {
        if (!r.ok) throw new Error(`Invariant violated: ${r.reason ?? 'unknown'}`);
    }
}

beforeEach(() => {
    resetMetrics();
    flushPending();
});

afterEach(() => {
    resetMetrics();
    flushPending();
});

// ─── met_session/initial ──────────────────────────────────────────────────────

describe('met_session/initial integration', () => {
    it('empty session — toolCalls=0, totalTokens=0, startedAt>0', async () => {
        const output = await runTool(brick, 'session', {});
        assertInvariants(checkMetSessionInitial(output));
    });
});

// ─── met_session/post-reset (adversarial) ────────────────────────────────────

describe('met_session/post-reset integration', () => {
    it('adversarial: session without prior tracking → toolCalls=0 (cohérent)', async () => {
        // No tracking done — session must return empty cohérent state
        const output = await runTool(brick, 'session', {});
        assertInvariants(checkMetSessionPostReset(output));
    });
});

// ─── met_tokens/happy ─────────────────────────────────────────────────────────

describe('met_tokens/happy integration', () => {
    it('sequenced: track 2 tool calls, verify cumulative stats', async () => {
        const out1 = await runTool(brick, 'tokens', {
            tool: 'search',
            inputTokens: 100,
            outputTokens: 50,
        });
        assertInvariants(checkMetTokensHappy(out1, 100, 50));

        const out2 = await runTool(brick, 'tokens', {
            tool: 'read',
            inputTokens: 200,
            outputTokens: 80,
        });
        assertInvariants(checkMetTokensHappy(out2, 300, 130));
    });
});

// ─── met_costs/happy ──────────────────────────────────────────────────────────

describe('met_costs/happy integration', () => {
    it('sequenced: track tokens then costs — inputCost+outputCost=totalCost', async () => {
        await runTool(brick, 'tokens', { tool: 'search', inputTokens: 1000, outputTokens: 500 });
        flushPending();
        const output = await runTool(brick, 'costs', {});
        assertInvariants(checkMetCostsHappy(output, 1000, 500));
    });
});

// ─── met_duration/happy ───────────────────────────────────────────────────────

describe('met_duration/happy integration', () => {
    it('sequenced: track tokens with duration, verify avg/min/max/calls', async () => {
        await runTool(brick, 'tokens', {
            tool: 'search',
            inputTokens: 10,
            outputTokens: 5,
            duration: 100,
        });
        await runTool(brick, 'tokens', {
            tool: 'read',
            inputTokens: 10,
            outputTokens: 5,
            duration: 200,
        });
        flushPending();
        const output = await runTool(brick, 'duration', {});
        // 2 calls, avg = (100+200)/2 = 150
        assertInvariants(checkMetDurationHappy(output, 2, 150));
    });
});
