/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import { runTool } from '@focus-mcp/marketplace-testing';
import { afterEach, beforeEach, describe, it } from 'vitest';
import brick from '../../src/index.js';
import { resetPlans } from '../../src/operations.js';
import { check as checkPlanCreateHappy } from './scenarios/plan_create/happy/invariants.js';
import { check as checkPlanDependenciesHappy } from './scenarios/plan_dependencies/happy/invariants.js';
import { check as checkPlanEstimateHappy } from './scenarios/plan_estimate/happy/invariants.js';
import { check as checkPlanStepsHappy } from './scenarios/plan_steps/happy/invariants.js';

beforeEach(() => {
    resetPlans();
});

afterEach(() => {
    resetPlans();
});

// ─── plan_create ──────────────────────────────────────────────────────────────

describe('plan_create integration', () => {
    it('happy: create({title}) → planId truthy, title matches', async () => {
        const output = await runTool(brick, 'create', { title: 'Build new feature' });
        for (const i of checkPlanCreateHappy(output)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── plan_steps ───────────────────────────────────────────────────────────────

describe('plan_steps integration', () => {
    it('happy: create + add 2 steps → shape valid, total=2', async () => {
        const createOutput = await runTool(brick, 'create', { title: 'Plan with steps' });
        const { planId } = createOutput as { planId: string };
        const output = await runTool(brick, 'steps', {
            planId,
            add: [
                { title: 'Step one', estimate: '30m' },
                { title: 'Step two', estimate: '1h' },
            ],
        });
        for (const i of checkPlanStepsHappy(output, planId)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── plan_dependencies ────────────────────────────────────────────────────────

describe('plan_dependencies integration', () => {
    it('happy: create + 2 steps + dependency(0→1) → dep recorded, step 1 blocked', async () => {
        const createOutput = await runTool(brick, 'create', { title: 'Plan with deps' });
        const { planId } = createOutput as { planId: string };
        await runTool(brick, 'steps', {
            planId,
            add: [
                { title: 'Step A', estimate: '30m' },
                { title: 'Step B', estimate: '1h' },
            ],
        });
        const output = await runTool(brick, 'dependencies', { planId, from: 0, to: 1 });
        for (const i of checkPlanDependenciesHappy(output, planId)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});

// ─── plan_estimate ────────────────────────────────────────────────────────────

describe('plan_estimate integration', () => {
    it('happy: create + 2 steps with estimates → estimatedMinutes=90', async () => {
        const createOutput = await runTool(brick, 'create', { title: 'Plan to estimate' });
        const { planId } = createOutput as { planId: string };
        await runTool(brick, 'steps', {
            planId,
            add: [
                { title: 'Step one', estimate: '30m' },
                { title: 'Step two', estimate: '1h' },
            ],
        });
        const output = await runTool(brick, 'estimate', { planId });
        for (const i of checkPlanEstimateHappy(output, planId)) {
            if (!i.ok) throw new Error(`Invariant violated: ${i.reason}`);
        }
    });
});
