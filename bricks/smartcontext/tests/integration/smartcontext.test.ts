/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { resolve } from 'node:path';
import { beforeEach, describe, it } from 'vitest';
import { _resetState, sctxLoad, sctxRefresh, sctxStatus } from '../../src/operations.js';
import { check as checkSctxLoadHappy } from './scenarios/sctx_load/happy/invariants.js';
import { check as checkSctxRefreshHappy } from './scenarios/sctx_refresh/happy/invariants.js';
import { check as checkSctxStatusHappy } from './scenarios/sctx_status/happy/invariants.js';

const FIXTURES_DIR = resolve(import.meta.dirname, 'fixtures');

// ─── Mocked bus ──────────────────────────────────────────────────────────────

function makeBus() {
    const responses: Record<string, unknown> = {
        'overview:project': { name: 'mini-project', framework: 'none', language: 'typescript' },
        'tokenbudget:analyze': {
            totalTokens: 120,
            files: [
                { path: resolve(FIXTURES_DIR, 'alpha.ts'), tokens: 60, lines: 10 },
                { path: resolve(FIXTURES_DIR, 'beta.ts'), tokens: 60, lines: 7 },
            ],
            top10: [
                { path: resolve(FIXTURES_DIR, 'alpha.ts'), tokens: 60 },
                { path: resolve(FIXTURES_DIR, 'beta.ts'), tokens: 60 },
            ],
        },
        'cache:warmup': { loaded: 2, failed: 0 },
        'tokenbudget:fill': {
            selected: [
                { path: resolve(FIXTURES_DIR, 'alpha.ts'), tokens: 60, mode: 'signatures' },
                { path: resolve(FIXTURES_DIR, 'beta.ts'), tokens: 60, mode: 'signatures' },
            ],
            used: 120,
            remaining: 1880,
        },
        'cache:stats': { entries: 2, hits: 1, misses: 1, hitRate: 0.5, totalBytes: 240 },
    };

    return {
        request: async (target: string): Promise<unknown> => responses[target] ?? {},
    };
}

beforeEach(() => {
    _resetState();
});

describe('sctx_load integration', () => {
    it('happy: load context for mini sandbox → structured output with all required fields', async () => {
        const bus = makeBus();
        const output = await sctxLoad(
            { task: 'understand the alpha/beta module structure', dir: FIXTURES_DIR, budget: 2000 },
            bus,
        );
        for (const i of checkSctxLoadHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

describe('sctx_refresh integration', () => {
    it('happy: load then refresh → refresh returns valid numeric stats', async () => {
        const bus = makeBus();
        // Sequence: load first to populate state
        await sctxLoad({ task: 'initial load', dir: FIXTURES_DIR }, bus);
        const output = await sctxRefresh({ dir: FIXTURES_DIR, budget: 2000 }, bus);
        for (const i of checkSctxRefreshHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

describe('sctx_status integration', () => {
    it('happy: load then status → state info with all numeric fields', async () => {
        const bus = makeBus();
        // Sequence: load first to populate state
        await sctxLoad({ task: 'initial load', dir: FIXTURES_DIR }, bus);
        const output = await sctxStatus(bus);
        for (const i of checkSctxStatusHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});
