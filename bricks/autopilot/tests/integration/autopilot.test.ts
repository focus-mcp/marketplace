/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { runTool } from '@focus-mcp/marketplace-testing';
import { afterEach, beforeEach, describe, it } from 'vitest';
import brick from '../../src/index.js';
import { resetAutopilot } from '../../src/operations.js';
import { check as checkAutoExecuteHappy } from './scenarios/auto_execute/happy/invariants.js';
import { check as checkAutoPlanHappy } from './scenarios/auto_plan/happy/invariants.js';
import { check as checkAutoStatusHappy } from './scenarios/auto_status/happy/invariants.js';

beforeEach(() => {
    resetAutopilot();
});

afterEach(() => {
    resetAutopilot();
});

// ─── auto_plan ────────────────────────────────────────────────────────────────

describe('auto_plan integration', () => {
    it('happy: plan({task}) → planId truthy, steps non-empty with title/reasoning/status', async () => {
        const output = await runTool(brick, 'plan', {
            task: 'add a hello world function',
        });
        for (const i of checkAutoPlanHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── auto_execute ─────────────────────────────────────────────────────────────

describe('auto_execute integration', () => {
    it('happy: plan + execute → step=0, status=done, result non-empty', async () => {
        const planOutput = await runTool(brick, 'plan', {
            task: 'add a hello world function',
        });
        const { planId } = planOutput as { planId: string };
        const executeOutput = await runTool(brick, 'execute', { planId });
        for (const i of checkAutoExecuteHappy(executeOutput, planId)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── auto_status ──────────────────────────────────────────────────────────────

describe('auto_status integration', () => {
    it('happy: plan + execute + status → completed>=1, totalSteps >= completed', async () => {
        const planOutput = await runTool(brick, 'plan', {
            task: 'add a hello world function',
        });
        const { planId } = planOutput as { planId: string };
        await runTool(brick, 'execute', { planId });
        const statusOutput = await runTool(brick, 'status', { planId });
        for (const i of checkAutoStatusHappy(statusOutput, planId)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});
