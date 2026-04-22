// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { randomUUID } from 'node:crypto';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PlanStep {
    title: string;
    estimate?: string;
    status: 'pending' | 'done' | 'blocked';
}

export interface Plan {
    id: string;
    title: string;
    description?: string;
    steps: PlanStep[];
    dependencies: Array<{ from: number; to: number }>;
    createdAt: number;
}

export interface PlanCreateInput {
    readonly title: string;
    readonly description?: string;
}

export interface PlanCreateOutput {
    planId: string;
    title: string;
}

export interface StepAddItem {
    title: string;
    estimate?: string;
}

export interface PlanStepsInput {
    readonly planId: string;
    readonly add?: readonly StepAddItem[];
    readonly complete?: number;
}

export interface PlanStepsOutput {
    planId: string;
    steps: PlanStep[];
    total: number;
    completed: number;
}

export interface PlanDependenciesInput {
    readonly planId: string;
    readonly from: number;
    readonly to: number;
}

export interface PlanDependenciesOutput {
    planId: string;
    dependency: { from: number; to: number };
    blockedSteps: number[];
}

export interface PlanEstimateInput {
    readonly planId: string;
}

export interface PlanEstimateOutput {
    planId: string;
    total: number;
    completed: number;
    remaining: number;
    blocked: number;
    estimatedMinutes: number;
    nextAvailable: PlanStep | null;
}

// ─── State ───────────────────────────────────────────────────────────────────

export const plans: Map<string, Plan> = new Map();

export function resetPlans(): void {
    plans.clear();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Parse a time estimate string into minutes.
 * Supports: "30m" => 30, "2h" => 120, "1d" => 480 (8h day).
 * Unknown format => 0.
 */
function parseEstimateMinutes(estimate: string): number {
    const trimmed = estimate.trim().toLowerCase();
    const match = /^(\d+(?:\.\d+)?)\s*([mhd])$/.exec(trimmed);
    if (!match) return 0;
    const value = Number.parseFloat(match[1] ?? '0');
    const unit = match[2];
    if (unit === 'm') return Math.round(value);
    if (unit === 'h') return Math.round(value * 60);
    if (unit === 'd') return Math.round(value * 480);
    return 0;
}

function getPlan(planId: string): Plan {
    const plan = plans.get(planId);
    if (!plan) throw new Error(`Plan not found: ${planId}`);
    return plan;
}

/**
 * Recompute blocked status for all steps based on current dependencies and done steps.
 */
function recomputeBlocked(plan: Plan): void {
    for (const dep of plan.dependencies) {
        const fromStep = plan.steps[dep.from];
        const toStep = plan.steps[dep.to];
        if (!fromStep || !toStep) continue;
        if (fromStep.status !== 'done' && toStep.status !== 'done') {
            toStep.status = 'blocked';
        }
        if (fromStep.status === 'done' && toStep.status === 'blocked') {
            // Only unblock if no other blocking dependency remains
            const stillBlocked = plan.dependencies.some(
                (d) => d.to === dep.to && plan.steps[d.from]?.status !== 'done',
            );
            if (!stillBlocked) {
                toStep.status = 'pending';
            }
        }
    }
}

// ─── planCreate ──────────────────────────────────────────────────────────────

export function planCreate(input: PlanCreateInput): PlanCreateOutput {
    const id = randomUUID();
    const plan: Plan = {
        id,
        title: input.title,
        ...(input.description !== undefined && { description: input.description }),
        steps: [],
        dependencies: [],
        createdAt: Date.now(),
    };
    plans.set(id, plan);
    return { planId: id, title: plan.title };
}

// ─── planSteps ───────────────────────────────────────────────────────────────

export function planSteps(input: PlanStepsInput): PlanStepsOutput {
    const plan = getPlan(input.planId);

    if (input.add && input.add.length > 0) {
        for (const item of input.add) {
            plan.steps.push({
                title: item.title,
                ...(item.estimate !== undefined && { estimate: item.estimate }),
                status: 'pending',
            });
        }
        recomputeBlocked(plan);
    }

    if (input.complete !== undefined) {
        const step = plan.steps[input.complete];
        if (!step) throw new Error(`Step index out of range: ${input.complete}`);
        step.status = 'done';
        recomputeBlocked(plan);
    }

    const completed = plan.steps.filter((s) => s.status === 'done').length;
    return {
        planId: plan.id,
        steps: plan.steps,
        total: plan.steps.length,
        completed,
    };
}

// ─── planDependencies ────────────────────────────────────────────────────────

export function planDependencies(input: PlanDependenciesInput): PlanDependenciesOutput {
    const plan = getPlan(input.planId);

    if (input.from < 0 || input.from >= plan.steps.length) {
        throw new Error(`Step index out of range: ${input.from}`);
    }
    if (input.to < 0 || input.to >= plan.steps.length) {
        throw new Error(`Step index out of range: ${input.to}`);
    }
    if (input.from === input.to) {
        throw new Error('A step cannot depend on itself');
    }

    plan.dependencies.push({ from: input.from, to: input.to });
    recomputeBlocked(plan);

    const blockedSteps = plan.steps
        .map((s, i) => ({ s, i }))
        .filter(({ s }) => s.status === 'blocked')
        .map(({ i }) => i);

    return {
        planId: plan.id,
        dependency: { from: input.from, to: input.to },
        blockedSteps,
    };
}

// ─── planEstimate ────────────────────────────────────────────────────────────

export function planEstimate(input: PlanEstimateInput): PlanEstimateOutput {
    const plan = getPlan(input.planId);

    const total = plan.steps.length;
    const completed = plan.steps.filter((s) => s.status === 'done').length;
    const blocked = plan.steps.filter((s) => s.status === 'blocked').length;
    const remaining = total - completed;

    const estimatedMinutes = plan.steps
        .filter((s) => s.status !== 'done')
        .reduce((sum, s) => sum + (s.estimate ? parseEstimateMinutes(s.estimate) : 0), 0);

    const nextAvailable = plan.steps.find((s) => s.status === 'pending') ?? null;

    return {
        planId: plan.id,
        total,
        completed,
        remaining,
        blocked,
        estimatedMinutes,
        nextAvailable,
    };
}
