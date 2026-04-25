/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { runTool } from '@focus-mcp/marketplace-testing';
import { afterEach, beforeEach, describe, it } from 'vitest';
import brick from '../../src/index.js';
import { resetShare } from '../../src/operations.js';
import { check as checkShrBroadcastHappy } from './scenarios/shr_broadcast/happy/invariants.js';
import {
    checkRead as checkShrContextRead,
    checkWrite as checkShrContextWrite,
} from './scenarios/shr_context/happy/invariants.js';
import { check as checkShrContextNonExistent } from './scenarios/shr_context/non-existent-key/invariants.js';
import {
    checkRead as checkShrFilesRead,
    checkWrite as checkShrFilesWrite,
} from './scenarios/shr_files/happy/invariants.js';
import {
    checkRead as checkShrResultsRead,
    checkStore as checkShrResultsStore,
} from './scenarios/shr_results/happy/invariants.js';

beforeEach(() => {
    resetShare();
});

afterEach(() => {
    resetShare();
});

// ─── shr_context ──────────────────────────────────────────────────────────────

describe('shr_context integration', () => {
    it('happy: set then read → value matches', async () => {
        const writeOutput = await runTool(brick, 'context', { key: 'my-key', value: 'my-value' });
        for (const i of checkShrContextWrite(writeOutput, 'my-value')) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
        const readOutput = await runTool(brick, 'context', { key: 'my-key' });
        for (const i of checkShrContextRead(readOutput, 'my-value')) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });

    it('non-existent-key: read key that was never set → value=undefined, set=false', async () => {
        const output = await runTool(brick, 'context', { key: 'no-such-key' });
        for (const i of checkShrContextNonExistent(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── shr_files ────────────────────────────────────────────────────────────────

describe('shr_files integration', () => {
    it('happy: register files then read → files match', async () => {
        const files = ['src/a.ts', 'src/b.ts'];
        const writeOutput = await runTool(brick, 'files', { agentId: 'agent-1', files });
        for (const i of checkShrFilesWrite(writeOutput, files)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
        const readOutput = await runTool(brick, 'files', { agentId: 'agent-1' });
        for (const i of checkShrFilesRead(readOutput, files)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── shr_results ─────────────────────────────────────────────────────────────

describe('shr_results integration', () => {
    it('happy: store result then read → result matches', async () => {
        const result = 'task completed successfully';
        const storeOutput = await runTool(brick, 'results', { taskId: 'task-42', result });
        for (const i of checkShrResultsStore(storeOutput)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
        const readOutput = await runTool(brick, 'results', { taskId: 'task-42' });
        for (const i of checkShrResultsRead(readOutput, result)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── shr_broadcast ────────────────────────────────────────────────────────────

describe('shr_broadcast integration', () => {
    it('happy: broadcast(msg, from) → delivered count + message echoed + timestamp present', async () => {
        const message = 'hello from agent-1';
        const output = await runTool(brick, 'broadcast', { message, from: 'agent-1' });
        for (const i of checkShrBroadcastHappy(output, message)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});
