// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { randomUUID } from 'node:crypto';

// ─── Types ───────────────────────────────────────────────────────────────────

export type TaskStatus = 'pending' | 'running' | 'done' | 'cancelled';

export interface DispatchTask {
    id: string;
    type: string;
    payload: Record<string, unknown>;
    priority: number;
    status: TaskStatus;
    createdAt: number;
    updatedAt: number;
}

export interface DspSendInput {
    readonly type: string;
    readonly payload: Record<string, unknown>;
    readonly priority?: number;
}

export interface DspSendOutput {
    id: string;
    type: string;
    priority: number;
    status: TaskStatus;
}

export interface DspQueueInput {
    readonly status?: string;
}

export interface DspQueueOutput {
    tasks: DispatchTask[];
    count: number;
}

export interface DspCancelInput {
    readonly id: string;
}

export interface DspCancelOutput {
    id: string;
    cancelled: boolean;
    previousStatus: TaskStatus;
}

export interface DspStatusInput {
    readonly id: string;
}

export type DspStatusOutput = DispatchTask | { error: string };

// ─── State ───────────────────────────────────────────────────────────────────

const tasks = new Map<string, DispatchTask>();

export function resetDispatch(): void {
    tasks.clear();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clampPriority(value: number | undefined): number {
    const raw = value ?? 5;
    return Math.min(10, Math.max(1, raw));
}

function matchesStatusFilter(task: DispatchTask, filter: string): boolean {
    if (filter === 'all' || filter === '') return true;
    return task.status === filter;
}

function sortByPriorityDesc(a: DispatchTask, b: DispatchTask): number {
    return b.priority - a.priority;
}

function isCancellable(status: TaskStatus): boolean {
    return status === 'pending' || status === 'running';
}

// ─── dspSend ─────────────────────────────────────────────────────────────────

export function dspSend(input: DspSendInput): DspSendOutput {
    const id = randomUUID();
    const now = Date.now();
    const priority = clampPriority(input.priority);

    const task: DispatchTask = {
        id,
        type: input.type,
        payload: input.payload,
        priority,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
    };

    tasks.set(id, task);

    return { id, type: task.type, priority: task.priority, status: task.status };
}

// ─── dspQueue ────────────────────────────────────────────────────────────────

export function dspQueue(input: DspQueueInput): DspQueueOutput {
    const filter = input.status ?? 'all';
    const filtered = [...tasks.values()].filter((t) => matchesStatusFilter(t, filter));
    filtered.sort(sortByPriorityDesc);
    return { tasks: filtered, count: filtered.length };
}

// ─── dspCancel ───────────────────────────────────────────────────────────────

export function dspCancel(input: DspCancelInput): DspCancelOutput {
    const task = tasks.get(input.id);

    if (!task) {
        return { id: input.id, cancelled: false, previousStatus: 'cancelled' };
    }

    const previousStatus = task.status;

    if (!isCancellable(task.status)) {
        return { id: input.id, cancelled: false, previousStatus };
    }

    const updated: DispatchTask = { ...task, status: 'cancelled', updatedAt: Date.now() };
    tasks.set(input.id, updated);

    return { id: input.id, cancelled: true, previousStatus };
}

// ─── dspStatus ───────────────────────────────────────────────────────────────

export function dspStatus(input: DspStatusInput): DspStatusOutput {
    const task = tasks.get(input.id);
    if (!task) return { error: `Task not found: ${input.id}` };
    return task;
}
