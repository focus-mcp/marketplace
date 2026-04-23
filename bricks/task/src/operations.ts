// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { randomUUID } from 'node:crypto';

// ─── Types ───────────────────────────────────────────────────────────────────

export type TaskStatus = 'pending' | 'assigned' | 'running' | 'done' | 'failed';

export interface TaskEntry {
    id: string;
    title: string;
    description: string;
    priority: number;
    status: TaskStatus;
    assignedTo?: string;
    result?: string;
    createdAt: number;
    updatedAt: number;
}

export interface TskCreateInput {
    readonly title: string;
    readonly description: string;
    readonly priority?: number;
}

export interface TskCreateOutput {
    id: string;
    title: string;
    priority: number;
    status: TaskStatus;
}

export interface TskAssignInput {
    readonly id: string;
    readonly agentId: string;
}

export interface TskAssignOutput {
    id: string;
    assignedTo: string;
    status: TaskStatus;
}

export interface TskStatusInput {
    readonly id?: string;
    readonly status?: TaskStatus;
}

export interface TskStatusListOutput {
    tasks: TaskEntry[];
    count: number;
}

export interface TskCompleteInput {
    readonly id: string;
    readonly result?: string;
}

export interface TskCompleteOutput {
    id: string;
    status: TaskStatus;
    result: string | undefined;
}

// ─── State ───────────────────────────────────────────────────────────────────

const tasks = new Map<string, TaskEntry>();

export function resetTasks(): void {
    tasks.clear();
}

// ─── tskCreate ───────────────────────────────────────────────────────────────

export function tskCreate(input: TskCreateInput): TskCreateOutput {
    const id = randomUUID();
    const now = Date.now();
    const priority = input.priority ?? 5;
    const entry: TaskEntry = {
        id,
        title: input.title,
        description: input.description,
        priority,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
    };
    tasks.set(id, entry);
    return { id, title: entry.title, priority, status: entry.status };
}

// ─── tskAssign ───────────────────────────────────────────────────────────────

export function tskAssign(input: TskAssignInput): TskAssignOutput {
    const entry = tasks.get(input.id);
    if (!entry) {
        throw new Error(`Task not found: ${input.id}`);
    }
    const updated: TaskEntry = {
        ...entry,
        assignedTo: input.agentId,
        status: 'assigned',
        updatedAt: Date.now(),
    };
    tasks.set(input.id, updated);
    return { id: updated.id, assignedTo: input.agentId, status: updated.status };
}

// ─── tskStatus ───────────────────────────────────────────────────────────────

export function tskStatus(input: TskStatusInput): TaskEntry | TskStatusListOutput {
    if (input.id !== undefined) {
        const entry = tasks.get(input.id);
        if (!entry) {
            throw new Error(`Task not found: ${input.id}`);
        }
        return entry;
    }

    const filtered =
        input.status !== undefined
            ? [...tasks.values()].filter((t) => t.status === input.status)
            : [...tasks.values()];

    return { tasks: filtered, count: filtered.length };
}

// ─── tskComplete ─────────────────────────────────────────────────────────────

export function tskComplete(input: TskCompleteInput): TskCompleteOutput {
    const entry = tasks.get(input.id);
    if (!entry) {
        throw new Error(`Task not found: ${input.id}`);
    }
    const updated: TaskEntry = {
        ...entry,
        status: 'done',
        updatedAt: Date.now(),
        ...(input.result !== undefined ? { result: input.result } : {}),
    };
    tasks.set(input.id, updated);
    return { id: updated.id, status: updated.status, result: updated.result };
}
