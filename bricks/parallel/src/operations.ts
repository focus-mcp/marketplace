// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TaskInput {
    readonly id: string;
    readonly command: string;
}

export interface ParRunInput {
    readonly tasks: readonly TaskInput[];
    readonly concurrency?: number;
    readonly cwd?: string;
}

export interface TaskResult {
    id: string;
    stdout: string;
    stderr: string;
    exitCode: number;
    duration: number;
    timedOut: boolean;
}

export interface ParallelRun {
    runId: string;
    startedAt: number;
    results: TaskResult[];
    defaultTimeoutMs: number;
}

export interface ParRunOutput {
    runId: string;
    taskCount: number;
    completed: number;
    failed: number;
}

export interface ParCollectInput {
    readonly runId: string;
}

export interface CollectSummary {
    total: number;
    completed: number;
    failed: number;
    timedOut: number;
}

export interface ParCollectOutput {
    runId: string;
    results: TaskResult[];
    summary: CollectSummary;
}

export interface MergeOutputItem {
    readonly id: string;
    readonly content: string;
}

export interface ParMergeInput {
    readonly outputs: readonly MergeOutputItem[];
    readonly separator?: string;
    readonly dedup?: boolean;
}

export interface ParMergeOutput {
    merged: string;
    lineCount: number;
}

export interface ParTimeoutInput {
    readonly defaultMs?: number;
    readonly runId?: string;
}

export interface ParTimeoutOutput {
    defaultMs: number;
    timedOut?: string[];
}

// ─── State ───────────────────────────────────────────────────────────────────

const runs = new Map<string, ParallelRun>();
let defaultTimeout = 30_000;

export function resetParallel(): void {
    runs.clear();
    defaultTimeout = 30_000;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseCommand(command: string): { file: string; args: string[] } {
    const parts = command.split(/\s+/);
    const file = parts[0] ?? '';
    const args = parts.slice(1);
    return { file, args };
}

function buildExecOptions(cwd: string | undefined, timeoutMs: number): Record<string, unknown> {
    const opts: Record<string, unknown> = { timeout: timeoutMs };
    if (cwd !== undefined) {
        opts['cwd'] = cwd;
    }
    return opts;
}

async function runTask(
    task: TaskInput,
    cwd: string | undefined,
    timeoutMs: number,
): Promise<TaskResult> {
    const start = Date.now();
    const { file, args } = parseCommand(task.command);

    try {
        const result = await execFileAsync(file, args, buildExecOptions(cwd, timeoutMs));
        return {
            id: task.id,
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: 0,
            duration: Date.now() - start,
            timedOut: false,
        };
    } catch (err) {
        const e = err as NodeJS.ErrnoException & {
            stdout?: string;
            stderr?: string;
            code?: number | string;
            killed?: boolean;
            signal?: string;
        };
        const timedOut = e.killed === true || e.signal === 'SIGTERM';
        return {
            id: task.id,
            stdout: e.stdout ?? '',
            stderr: e.stderr ?? '',
            exitCode: typeof e.code === 'number' ? e.code : 1,
            duration: Date.now() - start,
            timedOut,
        };
    }
}

async function runBatch(
    batch: readonly TaskInput[],
    cwd: string | undefined,
    timeoutMs: number,
): Promise<TaskResult[]> {
    return Promise.all(batch.map((t) => runTask(t, cwd, timeoutMs)));
}

function chunkTasks(tasks: readonly TaskInput[], size: number): TaskInput[][] {
    const chunks: TaskInput[][] = [];
    for (let i = 0; i < tasks.length; i += size) {
        chunks.push(tasks.slice(i, i + size) as TaskInput[]);
    }
    return chunks;
}

function buildSummary(results: TaskResult[]): CollectSummary {
    const failed = results.filter((r) => r.exitCode !== 0).length;
    const timedOut = results.filter((r) => r.timedOut).length;
    return {
        total: results.length,
        completed: results.length - failed,
        failed,
        timedOut,
    };
}

function applyDedup(lines: string[]): string[] {
    return [...new Set(lines)];
}

function mergeLines(
    outputs: readonly MergeOutputItem[],
    separator: string,
    dedup: boolean,
): string[] {
    const lines: string[] = [];
    for (const output of outputs) {
        const outputLines = output.content.split('\n');
        lines.push(...outputLines);
        if (separator !== '\n') {
            lines.push(separator);
        }
    }
    return dedup ? applyDedup(lines) : lines;
}

// ─── parRun ──────────────────────────────────────────────────────────────────

export async function parRun(input: ParRunInput): Promise<ParRunOutput> {
    const runId = randomUUID();
    const timeoutMs = defaultTimeout;
    const concurrency = input.concurrency ?? input.tasks.length;
    const effectiveConcurrency = Math.max(1, concurrency);

    const allResults: TaskResult[] = [];

    if (effectiveConcurrency >= input.tasks.length) {
        const results = await runBatch(input.tasks, input.cwd, timeoutMs);
        allResults.push(...results);
    } else {
        const chunks = chunkTasks(input.tasks, effectiveConcurrency);
        for (const chunk of chunks) {
            const results = await runBatch(chunk, input.cwd, timeoutMs);
            allResults.push(...results);
        }
    }

    const run: ParallelRun = {
        runId,
        startedAt: Date.now(),
        results: allResults,
        defaultTimeoutMs: timeoutMs,
    };
    runs.set(runId, run);

    const failed = allResults.filter((r) => r.exitCode !== 0).length;
    return {
        runId,
        taskCount: input.tasks.length,
        completed: allResults.length - failed,
        failed,
    };
}

// ─── parCollect ──────────────────────────────────────────────────────────────

export function parCollect(input: ParCollectInput): ParCollectOutput {
    const run = runs.get(input.runId);
    if (!run) {
        return {
            runId: input.runId,
            results: [],
            summary: { total: 0, completed: 0, failed: 0, timedOut: 0 },
        };
    }

    return {
        runId: run.runId,
        results: run.results,
        summary: buildSummary(run.results),
    };
}

// ─── parMerge ────────────────────────────────────────────────────────────────

export function parMerge(input: ParMergeInput): ParMergeOutput {
    const separator = input.separator ?? '\n';
    const dedup = input.dedup ?? false;

    const lines = mergeLines(input.outputs, separator, dedup);

    // Remove trailing separator entry if separator is not newline
    const cleanLines =
        separator !== '\n' && lines.at(-1) === separator ? lines.slice(0, -1) : lines;

    const merged = cleanLines.join('\n');
    const lineCount = cleanLines.filter((l) => l.length > 0).length;

    return { merged, lineCount };
}

// ─── parTimeout ──────────────────────────────────────────────────────────────

export function parTimeout(input: ParTimeoutInput): ParTimeoutOutput {
    if (input.defaultMs !== undefined) {
        defaultTimeout = input.defaultMs;
    }

    if (input.runId !== undefined) {
        const run = runs.get(input.runId);
        const timedOut = run ? run.results.filter((r) => r.timedOut).map((r) => r.id) : [];
        return { defaultMs: defaultTimeout, timedOut };
    }

    return { defaultMs: defaultTimeout };
}
