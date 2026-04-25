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
import { check as checkCpBudgetHappy } from './scenarios/cp_budget/happy/invariants.js';
import { check as checkCpEstimateHappy } from './scenarios/cp_estimate/happy/invariants.js';
import { check as checkCpPackHappy } from './scenarios/cp_pack/happy/invariants.js';
import { check as checkCpPrioritizeHappy } from './scenarios/cp_prioritize/happy/invariants.js';

const MARKETPLACE_ROOT = resolve(fileURLToPath(import.meta.url), '../../../../..');
const NESTJS = join(MARKETPLACE_ROOT, 'fixtures/nestjs/packages');
const COMMON = join(NESTJS, 'common/index.ts');
const TESTING = join(NESTJS, 'testing/index.ts');
const PLATFORM_WS = join(NESTJS, 'platform-ws/index.ts');
const FILES = [COMMON, TESTING, PLATFORM_WS];

function assertInvariants(scenario: string, results: InvariantResult[]): void {
    for (const r of results) {
        expect(r.ok, `[${scenario}] ${r.ok ? '' : r.reason}`).toBe(true);
    }
}

describe('cp_pack integration', () => {
    it('happy: pack 3 NestJS files in signatures mode → bundle with fileCount=3', async () => {
        const output = await runTool(brick, 'pack', { files: FILES, mode: 'signatures' });
        assertInvariants('cp_pack/happy', checkCpPackHappy(output));
    });
});

describe('cp_budget integration', () => {
    it('happy: fit NestJS files in budget=5000 → at least 1 included, tokensUsed ≤ 5000', async () => {
        const output = await runTool(brick, 'budget', { files: FILES, budget: 5000 });
        assertInvariants('cp_budget/happy', checkCpBudgetHappy(output));
    });
});

describe('cp_estimate integration', () => {
    it('happy: estimate 3 NestJS files → estimatedTokens > 0, perFile.length=3', async () => {
        const output = await runTool(brick, 'estimate', { files: FILES });
        assertInvariants('cp_estimate/happy', checkCpEstimateHappy(output));
    });
});

describe('cp_prioritize integration', () => {
    it('happy: files + query="testing" → testing/index.ts ranked first with score > 0', async () => {
        const output = await runTool(brick, 'prioritize', { files: FILES, query: 'testing' });
        assertInvariants('cp_prioritize/happy', checkCpPrioritizeHappy(output));
    });
});
