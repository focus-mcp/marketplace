/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { runTool } from '@focus-mcp/marketplace-testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import brick from '../../src/index.js';
import { resetTasks } from '../../src/operations.js';
import { check as checkTskAssignHappy } from './scenarios/tsk_assign/happy/invariants.js';
import { check as checkTskCompleteHappy } from './scenarios/tsk_complete/happy/invariants.js';
import { check as checkTskCompleteNonExistent } from './scenarios/tsk_complete/non-existent/invariants.js';
import { check as checkTskCreateHappy } from './scenarios/tsk_create/happy/invariants.js';
import { check as checkTskStatusHappy } from './scenarios/tsk_status/happy/invariants.js';

function assertInvariants(results: Array<{ ok: boolean; reason?: string }>): void {
    for (const r of results) {
        if (!r.ok) throw new Error(`Invariant violated: ${r.reason ?? 'unknown'}`);
    }
}

beforeEach(() => {
    resetTasks();
});

afterEach(() => {
    resetTasks();
});

// ─── tsk_create/happy ─────────────────────────────────────────────────────────

describe('tsk_create/happy integration', () => {
    it('create task → id truthy, status=pending', async () => {
        const output = await runTool(brick, 'create', {
            title: 'Implement feature X',
            description: 'Full implementation of feature X with tests',
        });
        assertInvariants(checkTskCreateHappy(output, 'Implement feature X'));
    });
});

// ─── tsk_assign/happy ─────────────────────────────────────────────────────────

describe('tsk_assign/happy integration', () => {
    it('sequenced: create + assign → assignedTo=agent-001, status=assigned', async () => {
        const createOut = await runTool(brick, 'create', {
            title: 'Task to assign',
            description: 'Will be assigned to an agent',
        });
        const { id } = createOut as { id: string };

        const assignOut = await runTool(brick, 'assign', { id, agentId: 'agent-001' });
        assertInvariants(checkTskAssignHappy(assignOut, id, 'agent-001'));
    });
});

// ─── tsk_status/happy ─────────────────────────────────────────────────────────

describe('tsk_status/happy integration', () => {
    it('sequenced: 3× create + status → tasks.length=3, count=3', async () => {
        await runTool(brick, 'create', { title: 'Task 1', description: 'First task' });
        await runTool(brick, 'create', { title: 'Task 2', description: 'Second task' });
        await runTool(brick, 'create', { title: 'Task 3', description: 'Third task' });

        const output = await runTool(brick, 'status', {});
        assertInvariants(checkTskStatusHappy(output, 3));
    });
});

// ─── tsk_complete/happy ───────────────────────────────────────────────────────

describe('tsk_complete/happy integration', () => {
    it('sequenced: create + complete + status → task.status=done', async () => {
        const createOut = await runTool(brick, 'create', {
            title: 'Task to complete',
            description: 'Will be marked done',
        });
        const { id } = createOut as { id: string };

        const completeOut = await runTool(brick, 'complete', {
            id,
            result: 'Feature X implemented successfully',
        });
        assertInvariants(checkTskCompleteHappy(completeOut, id));

        // Verify via status
        const statusOut = await runTool(brick, 'status', { id });
        const task = statusOut as { status: string };
        if (task.status !== 'done') {
            throw new Error(`Expected task.status='done' after complete, got '${task.status}'`);
        }
    });
});

// ─── tsk_complete/non-existent (adversarial) ──────────────────────────────────

describe('tsk_complete/non-existent integration', () => {
    it('adversarial: complete on non-existent taskId → clear error', async () => {
        let thrown: unknown;
        try {
            await runTool(brick, 'complete', { id: 'non-existent-id-12345' });
        } catch (err) {
            thrown = err;
        }
        expect(thrown).toBeDefined();
        assertInvariants(checkTskCompleteNonExistent(thrown));
    });
});
