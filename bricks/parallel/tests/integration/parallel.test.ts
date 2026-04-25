/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { runTool } from '@focus-mcp/marketplace-testing';
import { afterEach, beforeEach, describe, it } from 'vitest';
import brick from '../../src/index.js';
import { resetParallel } from '../../src/operations.js';
import { check as checkParCollectHappy } from './scenarios/par_collect/happy/invariants.js';
import { check as checkParMergeHappy } from './scenarios/par_merge/happy/invariants.js';
import { check as checkParRunHappy } from './scenarios/par_run/happy/invariants.js';
import { check as checkParTimeoutHappy } from './scenarios/par_timeout/happy/invariants.js';

beforeEach(() => {
    resetParallel();
});

afterEach(() => {
    resetParallel();
});

// ─── par_run ──────────────────────────────────────────────────────────────────

describe('par_run integration', () => {
    it('happy: run({tasks: [t1, t2]}) → runId truthy, taskCount=2, size<=2048B', async () => {
        const output = await runTool(brick, 'run', {
            tasks: [
                { id: 't1', command: 'echo hello' },
                { id: 't2', command: 'echo world' },
            ],
        });
        for (const i of checkParRunHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── par_collect ──────────────────────────────────────────────────────────────

describe('par_collect integration', () => {
    it('happy: run + collect → results[2] with id/exitCode/timedOut, size<=2048B', async () => {
        const runOutput = await runTool(brick, 'run', {
            tasks: [
                { id: 't1', command: 'echo hello' },
                { id: 't2', command: 'echo world' },
            ],
        });
        const { runId } = runOutput as { runId: string };
        const collectOutput = await runTool(brick, 'collect', { runId });
        for (const i of checkParCollectHappy(collectOutput, runId)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── par_merge ────────────────────────────────────────────────────────────────

describe('par_merge integration', () => {
    it('happy: merge([{a: line1}, {b: line2}]) → merged non-empty, lineCount>=1, size<=2048B', async () => {
        const output = await runTool(brick, 'merge', {
            outputs: [
                { id: 'a', content: 'line1' },
                { id: 'b', content: 'line2' },
            ],
        });
        for (const i of checkParMergeHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── par_timeout ──────────────────────────────────────────────────────────────

describe('par_timeout integration', () => {
    it('happy: timeout config check → defaultMs > 0, size<=2048B', async () => {
        const output = await runTool(brick, 'timeout', {});
        for (const i of checkParTimeoutHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});
