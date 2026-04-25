/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { runTool } from '@focus-mcp/marketplace-testing';
import { afterEach, beforeEach, describe, it } from 'vitest';
import brick from '../../src/index.js';
import { resetDispatch } from '../../src/operations.js';
import { check as checkDspCancelHappy } from './scenarios/dsp_cancel/happy/invariants.js';
import { check as checkDspQueueHappy } from './scenarios/dsp_queue/happy/invariants.js';
import { check as checkDspSendHappy } from './scenarios/dsp_send/happy/invariants.js';
import { check as checkDspStatusHappy } from './scenarios/dsp_status/happy/invariants.js';
import { check as checkDspStatusNonExistent } from './scenarios/dsp_status/non-existent/invariants.js';

beforeEach(() => {
    resetDispatch();
});

afterEach(() => {
    resetDispatch();
});

// ─── dsp_send ─────────────────────────────────────────────────────────────────

describe('dsp_send integration', () => {
    it('happy: send({type, payload}) → id truthy, status=pending', async () => {
        const output = await runTool(brick, 'send', {
            type: 'review',
            payload: { pr: 42 },
        });
        for (const i of checkDspSendHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── dsp_queue ────────────────────────────────────────────────────────────────

describe('dsp_queue integration', () => {
    it('happy: 2× send → queue count=2, each entry has id/type/status', async () => {
        await runTool(brick, 'send', { type: 'build', payload: { ref: 'main' } });
        await runTool(brick, 'send', { type: 'review', payload: { pr: 7 } });
        const output = await runTool(brick, 'queue', {});
        for (const i of checkDspQueueHappy(output, 2)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── dsp_cancel ───────────────────────────────────────────────────────────────

describe('dsp_cancel integration', () => {
    it('happy: send + cancel → cancelled=true, task not pending in queue', async () => {
        const sendOutput = await runTool(brick, 'send', {
            type: 'deploy',
            payload: { env: 'staging' },
        });
        const { id } = sendOutput as { id: string };
        const cancelOutput = await runTool(brick, 'cancel', { id });
        const queueOutput = await runTool(brick, 'queue', { status: 'pending' });
        for (const i of checkDspCancelHappy(cancelOutput, queueOutput, id)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── dsp_status ───────────────────────────────────────────────────────────────

describe('dsp_status integration', () => {
    it('happy: send + status → task fields match', async () => {
        const sendOutput = await runTool(brick, 'send', {
            type: 'test-run',
            payload: { suite: 'unit' },
        });
        const { id } = sendOutput as { id: string };
        const statusOutput = await runTool(brick, 'status', { id });
        for (const i of checkDspStatusHappy(statusOutput, id, 'test-run')) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });

    it('non-existent: status(unknown-id) → error field', async () => {
        const output = await runTool(brick, 'status', {
            id: '00000000-0000-0000-0000-000000000000',
        });
        for (const i of checkDspStatusNonExistent(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});
