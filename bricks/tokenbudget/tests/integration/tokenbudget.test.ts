/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */

import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { runTool } from '@focus-mcp/marketplace-testing';
import { describe, expect, it } from 'vitest';
import brick from '../../src/index.js';
import { check as checkTbAnalyzeHappy } from './scenarios/tb_analyze/happy/invariants.js';
import { check as checkTbEstimateHappy } from './scenarios/tb_estimate/happy/invariants.js';
import { check as checkTbFillHappy } from './scenarios/tb_fill/happy/invariants.js';
import { check as checkTbOptimizeHappy } from './scenarios/tb_optimize/happy/invariants.js';

const MARKETPLACE_ROOT = resolve(fileURLToPath(import.meta.url), '../../../../..');
const NESTJS_DIR = join(MARKETPLACE_ROOT, 'fixtures/nestjs');
const NESTJS_PKG = join(NESTJS_DIR, 'packages');
const FILES = [
    join(NESTJS_PKG, 'common/index.ts'),
    join(NESTJS_PKG, 'testing/index.ts'),
    join(NESTJS_PKG, 'platform-ws/index.ts'),
];

function assertInvariants(scenario: string, results: InvariantResult[]): void {
    for (const r of results) {
        expect(r.ok, `[${scenario}] ${r.ok ? '' : r.reason}`).toBe(true);
    }
}

describe('tb_estimate integration', () => {
    it('happy: estimate "Hello world" → tokens > 0, chars > 0, lines >= 1', async () => {
        const output = await runTool(brick, 'estimate', { text: 'Hello world' });
        assertInvariants('tb_estimate/happy', checkTbEstimateHappy(output));
    });
});

describe('tb_analyze integration', () => {
    it('happy: analyze fixtures/nestjs → totalTokens > 0, files non-empty, top10 present', async () => {
        const output = await runTool(brick, 'analyze', { dir: NESTJS_DIR, maxFiles: 20 });
        assertInvariants('tb_analyze/happy', checkTbAnalyzeHappy(output));
    });
});

describe('tb_fill integration', () => {
    it('happy: fill budget=5000 with NestJS files → at least 1 selected, used ≤ 5000', async () => {
        const output = await runTool(brick, 'fill', {
            budget: 5000,
            files: FILES,
            mode: 'signatures',
        });
        assertInvariants('tb_fill/happy', checkTbFillHappy(output));
    });
});

describe('tb_optimize integration', () => {
    it('happy: optimize budget=5000 on fixtures/nestjs → plan with mode assignments, fits boolean', async () => {
        const output = await runTool(brick, 'optimize', { budget: 5000, dir: NESTJS_DIR });
        assertInvariants('tb_optimize/happy', checkTbOptimizeHappy(output));
    });
});
