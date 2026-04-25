/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { runTool } from '@focus-mcp/marketplace-testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import brick from '../../src/index.js';
import { resetChains } from '../../src/operations.js';
import { check as checkThkBranchHappy } from './scenarios/thk_branch/happy/invariants.js';
import { check as checkThkReviseHappy } from './scenarios/thk_revise/happy/invariants.js';
import { checkThrows as checkThkReviseInvalidIndex } from './scenarios/thk_revise/invalid-index/invariants.js';
import { check as checkThkSummarizeHappy } from './scenarios/thk_summarize/happy/invariants.js';
import { check as checkThkThinkHappy } from './scenarios/thk_think/happy/invariants.js';

beforeEach(() => {
    resetChains();
});

afterEach(() => {
    resetChains();
});

// ─── thk_think ────────────────────────────────────────────────────────────────

describe('thk_think integration', () => {
    it('happy: think({thought}) → chainId non-empty, stepIndex=0', async () => {
        const output = await runTool(brick, 'think', {
            thought: 'The problem requires a systematic approach',
        });
        for (const i of checkThkThinkHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── thk_branch ───────────────────────────────────────────────────────────────

describe('thk_branch integration', () => {
    it('happy: think + branch → branchIndex=0, label matches', async () => {
        const thinkOutput = await runTool(brick, 'think', {
            thought: 'Initial thought for branching',
        });
        const { chainId } = thinkOutput as { chainId: string };
        const output = await runTool(brick, 'branch', {
            chainId,
            label: 'alternative approach',
            thought: 'We could also consider a different strategy',
        });
        for (const i of checkThkBranchHappy(output, chainId)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── thk_revise ───────────────────────────────────────────────────────────────

describe('thk_revise integration', () => {
    it('happy: think + revise(0) → original and revised returned', async () => {
        const originalThought = 'The problem requires a systematic approach';
        const thinkOutput = await runTool(brick, 'think', { thought: originalThought });
        const { chainId } = thinkOutput as { chainId: string };
        const output = await runTool(brick, 'revise', {
            chainId,
            stepIndex: 0,
            revision: 'A systematic approach with clear phases',
            reason: 'Added more specificity',
        });
        for (const i of checkThkReviseHappy(output, chainId, originalThought)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });

    it('invalid-index: revise out-of-range index → error thrown with clear message', async () => {
        const thinkOutput = await runTool(brick, 'think', { thought: 'Only one step' });
        const { chainId } = thinkOutput as { chainId: string };
        let caughtError: unknown;
        try {
            await runTool(brick, 'revise', {
                chainId,
                stepIndex: 99,
                revision: 'should fail',
                reason: 'testing error handling',
            });
        } catch (err) {
            caughtError = err;
        }
        expect(caughtError).toBeDefined();
        for (const i of checkThkReviseInvalidIndex(caughtError)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── thk_summarize ────────────────────────────────────────────────────────────

describe('thk_summarize integration', () => {
    it('happy: 3× think + summarize → steps=3, conclusion non-empty', async () => {
        const thinkOutput = await runTool(brick, 'think', { thought: 'First thought' });
        const { chainId } = thinkOutput as { chainId: string };
        await runTool(brick, 'think', { chainId, thought: 'Second thought' });
        await runTool(brick, 'think', { chainId, thought: 'Third thought and conclusion' });
        const output = await runTool(brick, 'summarize', { chainId });
        for (const i of checkThkSummarizeHappy(output, chainId)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});
