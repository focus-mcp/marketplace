/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { runTool } from '@focus-mcp/marketplace-testing';
import { describe, it } from 'vitest';
import brick from '../../src/index.js';
import { check as checkBatMultiHappy } from './scenarios/bat_multi/happy/invariants.js';
import { check as checkBatParallelHappy } from './scenarios/bat_parallel/happy/invariants.js';
import { check as checkBatPipelineHappy } from './scenarios/bat_pipeline/happy/invariants.js';
import { check as checkBatSequentialHappy } from './scenarios/bat_sequential/happy/invariants.js';

// batch is stateless — no reset needed

// ─── bat_multi ────────────────────────────────────────────────────────────────

describe('bat_multi integration', () => {
    it('happy: multi([echo a, echo b]) → 2 results, each exitCode=0', async () => {
        const output = await runTool(brick, 'multi', {
            commands: ['echo a', 'echo b'],
        });
        for (const i of checkBatMultiHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── bat_sequential ───────────────────────────────────────────────────────────

describe('bat_sequential integration', () => {
    it('happy: sequential([echo 1, echo 2]) → 2 ordered results, no stoppedAt', async () => {
        const output = await runTool(brick, 'sequential', {
            commands: ['echo 1', 'echo 2'],
        });
        for (const i of checkBatSequentialHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── bat_parallel ─────────────────────────────────────────────────────────────

describe('bat_parallel integration', () => {
    it('happy: parallel([echo a, echo b]) → 2 results with duration', async () => {
        const output = await runTool(brick, 'parallel', {
            commands: ['echo a', 'echo b'],
        });
        for (const i of checkBatParallelHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── bat_pipeline ─────────────────────────────────────────────────────────────

describe('bat_pipeline integration', () => {
    it('happy: pipeline([echo hello, cat]) → exitCode=0, stdout non-empty', async () => {
        const output = await runTool(brick, 'pipeline', {
            commands: ['echo hello', 'cat'],
        });
        for (const i of checkBatPipelineHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});
