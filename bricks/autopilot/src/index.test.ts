// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { autoExecute, autoPlan, autoStatus, resetAutopilot } from './operations.ts';

// ─── Helpers ──────────────────────────────────────────────────────────────────

beforeEach(() => {
    resetAutopilot();
});

// ─── autoPlan ─────────────────────────────────────────────────────────────────

describe('autoPlan', () => {
    it('returns a planId, task, and steps', () => {
        const result = autoPlan({ task: 'implement authentication' });
        expect(typeof result.planId).toBe('string');
        expect(result.planId.length).toBeGreaterThan(0);
        expect(result.task).toBe('implement authentication');
        expect(Array.isArray(result.steps)).toBe(true);
    });

    it('generates between 3 and 5 steps', () => {
        const result = autoPlan({ task: 'add login feature' });
        expect(result.steps.length).toBeGreaterThanOrEqual(3);
        expect(result.steps.length).toBeLessThanOrEqual(5);
    });

    it('all steps start as pending', () => {
        const result = autoPlan({ task: 'refactor database layer' });
        for (const step of result.steps) {
            expect(step.status).toBe('pending');
        }
    });

    it('each step has a title and reasoning', () => {
        const result = autoPlan({ task: 'write unit tests for service' });
        for (const step of result.steps) {
            expect(typeof step.title).toBe('string');
            expect(step.title.length).toBeGreaterThan(0);
            expect(typeof step.reasoning).toBe('string');
            expect(step.reasoning.length).toBeGreaterThan(0);
        }
    });

    it('accepts optional dir', () => {
        const result = autoPlan({ task: 'build CLI tool', dir: '/project' });
        expect(result.planId).toBeDefined();
        expect(result.task).toBe('build CLI tool');
    });

    it('generates unique plan IDs for different calls', () => {
        const r1 = autoPlan({ task: 'task A' });
        const r2 = autoPlan({ task: 'task B' });
        expect(r1.planId).not.toBe(r2.planId);
    });

    it('includes "analyze" step in all plans', () => {
        const result = autoPlan({ task: 'do something' });
        const titles = result.steps.map((s) => s.title.toLowerCase());
        expect(titles.some((t) => t.includes('analyze'))).toBe(true);
    });

    it('includes "verify" or "test" step in all plans', () => {
        const result = autoPlan({ task: 'do something' });
        const titles = result.steps.map((s) => s.title.toLowerCase());
        expect(titles.some((t) => t.includes('test') || t.includes('verify'))).toBe(true);
    });
});

// ─── autoExecute ─────────────────────────────────────────────────────────────

describe('autoExecute', () => {
    it('executes the first pending step and marks it done', () => {
        const { planId } = autoPlan({ task: 'implement feature' });
        const result = autoExecute({ planId });
        expect(result.planId).toBe(planId);
        expect(result.step).toBe(0);
        expect(result.status).toBe('done');
    });

    it('returns reasoning from the executed step', () => {
        const { planId } = autoPlan({ task: 'add endpoint' });
        const result = autoExecute({ planId });
        expect(typeof result.reasoning).toBe('string');
        expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it('returns a result string', () => {
        const { planId } = autoPlan({ task: 'add endpoint' });
        const result = autoExecute({ planId });
        expect(typeof result.result).toBe('string');
    });

    it('advances to next pending step on successive calls', () => {
        const { planId } = autoPlan({ task: 'implement feature' });
        const first = autoExecute({ planId });
        const second = autoExecute({ planId });
        expect(first.step).toBe(0);
        expect(second.step).toBe(1);
    });

    it('executes a specific step by index', () => {
        const { planId } = autoPlan({ task: 'implement feature' });
        const result = autoExecute({ planId, step: 2 });
        expect(result.step).toBe(2);
        expect(result.status).toBe('done');
    });

    it('returns failed status when planId is unknown', () => {
        const result = autoExecute({ planId: 'nonexistent-id' });
        expect(result.status).toBe('failed');
        expect(result.step).toBe(-1);
    });

    it('returns failed status when step index is out of range', () => {
        const { planId } = autoPlan({ task: 'task' });
        const result = autoExecute({ planId, step: 999 });
        expect(result.status).toBe('failed');
    });
});

// ─── autoStatus ──────────────────────────────────────────────────────────────

describe('autoStatus', () => {
    it('returns plan overview with all pending steps initially', () => {
        const { planId, task, steps } = autoPlan({ task: 'build something' });
        const status = autoStatus({ planId });
        expect(status.planId).toBe(planId);
        expect(status.task).toBe(task);
        expect(status.totalSteps).toBe(steps.length);
        expect(status.completed).toBe(0);
        expect(status.current).toBeNull();
        expect(status.nextStep).toBe(0);
    });

    it('reflects completed steps after execution', () => {
        const { planId } = autoPlan({ task: 'implement feature' });
        autoExecute({ planId });
        autoExecute({ planId });
        const status = autoStatus({ planId });
        expect(status.completed).toBe(2);
        expect(status.nextStep).toBe(2);
    });

    it('nextStep is null when all steps are done', () => {
        const { planId, steps } = autoPlan({ task: 'simple task' });
        for (let i = 0; i < steps.length; i++) {
            autoExecute({ planId });
        }
        const status = autoStatus({ planId });
        expect(status.completed).toBe(steps.length);
        expect(status.nextStep).toBeNull();
    });

    it('returns empty result for unknown planId', () => {
        const status = autoStatus({ planId: 'unknown' });
        expect(status.totalSteps).toBe(0);
        expect(status.task).toBe('');
        expect(status.completed).toBe(0);
        expect(status.current).toBeNull();
        expect(status.nextStep).toBeNull();
    });

    it('current is null when no step is running', () => {
        const { planId } = autoPlan({ task: 'task' });
        const status = autoStatus({ planId });
        expect(status.current).toBeNull();
    });
});

// ─── autopilot brick ─────────────────────────────────────────────────────────

describe('autopilot brick', () => {
    it('registers 3 handlers on start and unregisters on stop', async () => {
        const { default: brick } = await import('./index.ts');
        const unsubFns: Array<() => void> = [];
        const bus = {
            handle: vi.fn(() => {
                const unsub = vi.fn();
                unsubFns.push(unsub);
                return unsub;
            }),
            on: vi.fn(),
            request: vi.fn(async () => ({})),
        };

        await brick.start({ bus });
        expect(bus.handle).toHaveBeenCalledTimes(3);
        expect(bus.handle).toHaveBeenCalledWith('autopilot:plan', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('autopilot:execute', expect.any(Function));
        expect(bus.handle).toHaveBeenCalledWith('autopilot:status', expect.any(Function));

        await brick.stop();
        for (const unsub of unsubFns) {
            expect(unsub).toHaveBeenCalled();
        }
    });

    it('exposes correct manifest name and prefix', async () => {
        const { default: brick } = await import('./index.ts');
        expect(brick.manifest.name).toBe('autopilot');
        expect(brick.manifest.prefix).toBe('auto');
    });

    it('double start does not accumulate handlers', async () => {
        const { default: brick } = await import('./index.ts');
        const bus = {
            handle: vi.fn(() => vi.fn()),
            on: vi.fn(),
            request: vi.fn(async () => ({})),
        };

        await brick.start({ bus });
        await brick.start({ bus });
        // Each start resets and re-registers — 3 handlers per start call
        expect(bus.handle).toHaveBeenCalledTimes(6);
    });
});
