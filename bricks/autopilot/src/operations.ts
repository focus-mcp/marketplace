// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { randomUUID } from 'node:crypto';

// ─── Types ────────────────────────────────────────────────────────────────────

export type StepStatus = 'pending' | 'running' | 'done' | 'failed';

export interface PlanStep {
    title: string;
    reasoning: string;
    status: StepStatus;
    result?: string;
}

export interface AutoPlan {
    id: string;
    task: string;
    dir?: string;
    steps: PlanStep[];
    createdAt: number;
}

export interface PlanInput {
    readonly task: string;
    readonly dir?: string;
}

export interface PlanOutput {
    planId: string;
    task: string;
    steps: ReadonlyArray<{ title: string; reasoning: string; status: StepStatus }>;
}

export interface ExecuteInput {
    readonly planId: string;
    readonly step?: number;
}

export interface ExecuteOutput {
    planId: string;
    step: number;
    status: StepStatus;
    reasoning: string;
    result: string;
}

export interface StatusInput {
    readonly planId: string;
}

export interface StatusOutput {
    planId: string;
    task: string;
    totalSteps: number;
    completed: number;
    current: number | null;
    nextStep: number | null;
}

// ─── Internal state ───────────────────────────────────────────────────────────

const plans: Map<string, AutoPlan> = new Map();

export function resetAutopilot(): void {
    plans.clear();
}

// ─── Step generation helpers ──────────────────────────────────────────────────

interface StepTemplate {
    title: string;
    reasoning: string;
}

function buildSteps(task: string): PlanStep[] {
    const lower = task.toLowerCase();
    const templates: StepTemplate[] = [];

    templates.push({
        title: 'Analyze task and gather context',
        reasoning: `Understand the scope of "${task}" by reading relevant files and loading project context.`,
    });

    if (lower.includes('test') || lower.includes('spec') || lower.includes('coverage')) {
        templates.push({
            title: 'Run existing tests to establish baseline',
            reasoning: 'Identify current test state before making changes.',
        });
    }

    if (
        lower.includes('implement') ||
        lower.includes('add') ||
        lower.includes('create') ||
        lower.includes('build') ||
        lower.includes('write')
    ) {
        templates.push({
            title: 'Implement the required changes',
            reasoning: `Apply the code changes needed to fulfill: "${task}".`,
        });
    }

    if (lower.includes('refactor') || lower.includes('clean') || lower.includes('improve')) {
        templates.push({
            title: 'Refactor and clean up',
            reasoning: 'Apply structural improvements while preserving existing behaviour.',
        });
    }

    templates.push({
        title: 'Test and verify',
        reasoning: 'Run tests, linting, and type-checking to confirm correctness.',
    });

    templates.push({
        title: 'Review and summarise',
        reasoning: 'Inspect the diff, validate acceptance criteria, and document outcomes.',
    });

    // Clamp to 3-5 steps
    const clamped = templates.slice(0, 5);
    while (clamped.length < 3) {
        clamped.push({
            title: `Step ${String(clamped.length + 1)}`,
            reasoning: 'Additional verification step.',
        });
    }

    return clamped.map((t) => ({
        title: t.title,
        reasoning: t.reasoning,
        status: 'pending' as StepStatus,
    }));
}

// ─── autoPlan ─────────────────────────────────────────────────────────────────

export function autoPlan(input: PlanInput): PlanOutput {
    const id = randomUUID();
    const steps = buildSteps(input.task);

    const plan: AutoPlan = {
        id,
        task: input.task,
        steps,
        createdAt: Date.now(),
    };

    if (input.dir !== undefined) {
        plan.dir = input.dir;
    }

    plans.set(id, plan);

    return {
        planId: id,
        task: input.task,
        steps: steps.map((s) => ({ title: s.title, reasoning: s.reasoning, status: s.status })),
    };
}

// ─── autoExecute ─────────────────────────────────────────────────────────────

export function autoExecute(input: ExecuteInput): ExecuteOutput {
    const plan = plans.get(input.planId);
    if (plan === undefined) {
        return {
            planId: input.planId,
            step: -1,
            status: 'failed',
            reasoning: `Plan "${input.planId}" not found.`,
            result: 'error: plan not found',
        };
    }

    // Determine which step index to execute
    let stepIndex: number;
    if (input.step !== undefined) {
        stepIndex = input.step;
    } else {
        const nextPending = plan.steps.findIndex((s) => s.status === 'pending');
        stepIndex = nextPending;
    }

    if (stepIndex < 0 || stepIndex >= plan.steps.length) {
        return {
            planId: input.planId,
            step: stepIndex,
            status: 'failed',
            reasoning: 'No pending step found or step index out of range.',
            result: 'error: no step to execute',
        };
    }

    const step = plan.steps[stepIndex];

    if (step === undefined) {
        return {
            planId: input.planId,
            step: stepIndex,
            status: 'failed',
            reasoning: 'Step not found at given index.',
            result: 'error: step not found',
        };
    }

    step.status = 'running';
    step.status = 'done';
    step.result = `Completed: ${step.title}`;

    return {
        planId: input.planId,
        step: stepIndex,
        status: 'done',
        reasoning: step.reasoning,
        result: step.result,
    };
}

// ─── autoStatus ──────────────────────────────────────────────────────────────

export function autoStatus(input: StatusInput): StatusOutput {
    const plan = plans.get(input.planId);
    if (plan === undefined) {
        return {
            planId: input.planId,
            task: '',
            totalSteps: 0,
            completed: 0,
            current: null,
            nextStep: null,
        };
    }

    const completed = plan.steps.filter((s) => s.status === 'done').length;
    const runningIndex = plan.steps.findIndex((s) => s.status === 'running');
    const nextPendingIndex = plan.steps.findIndex((s) => s.status === 'pending');

    const current = runningIndex >= 0 ? runningIndex : null;
    const nextStep = nextPendingIndex >= 0 ? nextPendingIndex : null;

    return {
        planId: plan.id,
        task: plan.task,
        totalSteps: plan.steps.length,
        completed,
        current,
        nextStep,
    };
}
