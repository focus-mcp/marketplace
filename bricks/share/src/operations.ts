// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FileShare {
    agentId: string;
    files: string[];
}

export interface BroadcastEntry {
    from: string;
    message: string;
    timestamp: string;
}

export interface ShrContextInput {
    readonly key: string;
    readonly value?: unknown;
}

export interface ShrContextOutput {
    key: string;
    value: unknown;
    set: boolean;
}

export interface ShrFilesInput {
    readonly agentId: string;
    readonly files?: readonly string[];
}

export interface ShrFilesOutput {
    agentId: string;
    files: string[];
    count: number;
}

export interface ShrResultsInput {
    readonly taskId: string;
    readonly result?: unknown;
}

export interface ShrResultsOutput {
    taskId: string;
    result: unknown;
    stored: boolean;
}

export interface ShrBroadcastInput {
    readonly message: string;
    readonly from: string;
}

export interface ShrBroadcastOutput {
    delivered: number;
    message: string;
    timestamp: string;
}

export type ListenerCallback = (entry: BroadcastEntry) => void;

export interface Listener {
    id: string;
    callback: ListenerCallback;
}

// ─── State ───────────────────────────────────────────────────────────────────

export const sharedContext = new Map<string, unknown>();
export const sharedFiles = new Map<string, FileShare>();
export const sharedResults = new Map<string, unknown>();
export const listeners: Listener[] = [];

// ─── resetShare ──────────────────────────────────────────────────────────────

export function resetShare(): void {
    sharedContext.clear();
    sharedFiles.clear();
    sharedResults.clear();
    listeners.length = 0;
}

// ─── shrContext ───────────────────────────────────────────────────────────────

export function shrContext(input: ShrContextInput): ShrContextOutput {
    const set = 'value' in input;
    if (set) {
        sharedContext.set(input.key, input.value);
    }
    const value = sharedContext.get(input.key);
    return { key: input.key, value, set };
}

// ─── shrFiles ────────────────────────────────────────────────────────────────

export function shrFiles(input: ShrFilesInput): ShrFilesOutput {
    const hasFiles = 'files' in input && input.files !== undefined;
    if (hasFiles) {
        const current = sharedFiles.get(input.agentId);
        const merged = current
            ? [...new Set([...current.files, ...(input.files ?? [])])]
            : [...(input.files ?? [])];
        sharedFiles.set(input.agentId, { agentId: input.agentId, files: merged });
    }
    const entry = sharedFiles.get(input.agentId);
    const files = entry?.files ?? [];
    return { agentId: input.agentId, files, count: files.length };
}

// ─── shrResults ───────────────────────────────────────────────────────────────

export function shrResults(input: ShrResultsInput): ShrResultsOutput {
    const stored = 'result' in input;
    if (stored) {
        sharedResults.set(input.taskId, input.result);
    }
    const result = sharedResults.get(input.taskId);
    return { taskId: input.taskId, result, stored };
}

// ─── shrBroadcast ─────────────────────────────────────────────────────────────

export function shrBroadcast(input: ShrBroadcastInput): ShrBroadcastOutput {
    const timestamp = new Date().toISOString();
    const entry: BroadcastEntry = { from: input.from, message: input.message, timestamp };
    const delivered = listeners.length;
    for (const listener of listeners) {
        listener.callback(entry);
    }
    return { delivered, message: input.message, timestamp };
}
