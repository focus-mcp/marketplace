// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { planCreate, planDependencies, planEstimate, planSteps, resetPlans } from './operations.ts';

beforeEach(() => {
    resetPlans();
});

afterEach(() => {
    resetPlans();
});

// ─── planCreate ───────────────────────────────────────────────────────────────

describe('planCreate', () => {
    it('creates a plan with a title', () => {
        const result = planCreate({ title: 'My Plan' });
        expect(result.planId).toBeTypeOf('string');
        expect(result.title).toBe('My Plan');
    });

    it('creates a plan with a description', () => {
        const result = planCreate({ title: 'Plan A', description: 'Some description' });
        expect(result.planId).toBeTypeOf('string');
        expect(result.title).toBe('Plan A');
    });

    it('creates unique IDs for each plan', () => {
        const a = planCreate({ title: 'Plan A' });
        const b = planCreate({ title: 'Plan B' });
        expect(a.planId).not.toBe(b.planId);
    });
});

// ─── planSteps ────────────────────────────────────────────────────────────────

describe('planSteps', () => {
    it('adds steps to a plan', () => {
        const { planId } = planCreate({ title: 'Test' });
        const result = planSteps({
            planId,
            add: [
                { title: 'Step 1', estimate: '30m' },
                { title: 'Step 2', estimate: '1h' },
            ],
        });
        expect(result.total).toBe(2);
        expect(result.completed).toBe(0);
        expect(result.steps[0]?.title).toBe('Step 1');
        expect(result.steps[0]?.status).toBe('pending');
        expect(result.steps[1]?.estimate).toBe('1h');
    });

    it('lists steps without modification when no add or complete', () => {
        const { planId } = planCreate({ title: 'Test' });
        planSteps({ planId, add: [{ title: 'Step A' }] });
        const result = planSteps({ planId });
        expect(result.total).toBe(1);
    });

    it('marks a step as done', () => {
        const { planId } = planCreate({ title: 'Test' });
        planSteps({ planId, add: [{ title: 'Step 1' }, { title: 'Step 2' }] });
        const result = planSteps({ planId, complete: 0 });
        expect(result.completed).toBe(1);
        expect(result.steps[0]?.status).toBe('done');
    });

    it('throws when planId not found', () => {
        expect(() => planSteps({ planId: 'nonexistent' })).toThrow('Plan not found');
    });

    it('throws when complete index is out of range', () => {
        const { planId } = planCreate({ title: 'Test' });
        planSteps({ planId, add: [{ title: 'Only step' }] });
        expect(() => planSteps({ planId, complete: 5 })).toThrow('Step index out of range');
    });
});

// ─── planDependencies ─────────────────────────────────────────────────────────

describe('planDependencies', () => {
    it('adds a dependency and blocks the dependent step', () => {
        const { planId } = planCreate({ title: 'Test' });
        planSteps({ planId, add: [{ title: 'Step A' }, { title: 'Step B' }] });
        const result = planDependencies({ planId, from: 0, to: 1 });
        expect(result.dependency).toEqual({ from: 0, to: 1 });
        expect(result.blockedSteps).toContain(1);
    });

    it('unblocks step when from step is completed', () => {
        const { planId } = planCreate({ title: 'Test' });
        planSteps({ planId, add: [{ title: 'A' }, { title: 'B' }] });
        planDependencies({ planId, from: 0, to: 1 });
        // Complete the from step
        const result = planSteps({ planId, complete: 0 });
        expect(result.steps[1]?.status).toBe('pending');
    });

    it('throws when planId not found', () => {
        expect(() => planDependencies({ planId: 'bad', from: 0, to: 1 })).toThrow('Plan not found');
    });

    it('throws when step index is out of range', () => {
        const { planId } = planCreate({ title: 'Test' });
        planSteps({ planId, add: [{ title: 'Only' }] });
        expect(() => planDependencies({ planId, from: 0, to: 5 })).toThrow(
            'Step index out of range',
        );
    });

    it('throws when from equals to', () => {
        const { planId } = planCreate({ title: 'Test' });
        planSteps({ planId, add: [{ title: 'Step' }] });
        expect(() => planDependencies({ planId, from: 0, to: 0 })).toThrow(
            'A step cannot depend on itself',
        );
    });
});

// ─── planEstimate ─────────────────────────────────────────────────────────────

describe('planEstimate', () => {
    it('returns zeroes for empty plan', () => {
        const { planId } = planCreate({ title: 'Empty' });
        const result = planEstimate({ planId });
        expect(result.total).toBe(0);
        expect(result.completed).toBe(0);
        expect(result.remaining).toBe(0);
        expect(result.blocked).toBe(0);
        expect(result.estimatedMinutes).toBe(0);
        expect(result.nextAvailable).toBeNull();
    });

    it('calculates total estimated minutes from pending steps', () => {
        const { planId } = planCreate({ title: 'Plan' });
        planSteps({
            planId,
            add: [
                { title: 'A', estimate: '30m' },
                { title: 'B', estimate: '2h' },
                { title: 'C', estimate: '1d' },
            ],
        });
        const result = planEstimate({ planId });
        // 30 + 120 + 480 = 630
        expect(result.estimatedMinutes).toBe(630);
        expect(result.total).toBe(3);
        expect(result.remaining).toBe(3);
    });

    it('excludes completed steps from estimate', () => {
        const { planId } = planCreate({ title: 'Plan' });
        planSteps({
            planId,
            add: [
                { title: 'A', estimate: '1h' },
                { title: 'B', estimate: '1h' },
            ],
        });
        planSteps({ planId, complete: 0 });
        const result = planEstimate({ planId });
        expect(result.estimatedMinutes).toBe(60);
        expect(result.completed).toBe(1);
        expect(result.remaining).toBe(1);
    });

    it('returns the first pending step as nextAvailable', () => {
        const { planId } = planCreate({ title: 'Plan' });
        planSteps({ planId, add: [{ title: 'First' }, { title: 'Second' }] });
        const result = planEstimate({ planId });
        expect(result.nextAvailable?.title).toBe('First');
    });

    it('skips blocked steps for nextAvailable', () => {
        const { planId } = planCreate({ title: 'Plan' });
        planSteps({ planId, add: [{ title: 'A' }, { title: 'B' }, { title: 'C' }] });
        // B depends on A (blocks B), C is still pending
        planDependencies({ planId, from: 0, to: 1 });
        const result = planEstimate({ planId });
        // nextAvailable = first pending step (A is pending, B is blocked)
        expect(result.nextAvailable?.title).toBe('A');
        expect(result.blocked).toBe(1);
    });

    it('throws when planId not found', () => {
        expect(() => planEstimate({ planId: 'ghost' })).toThrow('Plan not found');
    });
});

// ─── brick wiring ─────────────────────────────────────────────────────────────

describe('planning brick', () => {
    it('registers 4 handlers on start and unregisters on stop', async () => {
        const { default: brick } = await import('./index.ts');
        const unsubbers: Array<() => void> = [];
        const bus = {
            handle: vi.fn(() => {
                const unsub = vi.fn();
                unsubbers.push(unsub);
                return unsub;
            }),
            on: vi.fn(),
        };

        await brick.start({ bus });
        expect(bus.handle).toHaveBeenCalledTimes(4);
        expect(bus.handle).toHaveBeenCalledWith('planning:create', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('planning:steps', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('planning:dependencies', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('planning:estimate', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubbers) {
            expect(unsub).toHaveBeenCalled();
        }
    });
});
