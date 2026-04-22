// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CommandResult {
    command: string;
    stdout: string;
    stderr: string;
    exitCode: number;
    duration: number;
}

export interface BatMultiInput {
    readonly commands: readonly string[];
    readonly cwd?: string;
    readonly timeout?: number;
}

export interface BatMultiOutput {
    results: CommandResult[];
}

export interface BatSequentialInput {
    readonly commands: readonly string[];
    readonly cwd?: string;
    readonly timeout?: number;
    readonly continueOnError?: boolean;
}

export interface BatSequentialOutput {
    results: CommandResult[];
    stoppedAt?: number;
}

export interface BatParallelInput {
    readonly commands: readonly string[];
    readonly cwd?: string;
    readonly timeout?: number;
    readonly maxConcurrency?: number;
}

export interface BatParallelOutput {
    results: CommandResult[];
    duration: number;
}

export interface BatPipelineInput {
    readonly commands: readonly string[];
    readonly cwd?: string;
    readonly timeout?: number;
}

export interface BatPipelineOutput {
    stdout: string;
    stderr: string;
    exitCode: number;
    duration: number;
}

// ─── Helper ──────────────────────────────────────────────────────────────────

async function runOne(command: string, cwd: string, timeout: number): Promise<CommandResult> {
    const start = Date.now();
    try {
        const { stdout, stderr } = await execFileAsync('sh', ['-c', command], {
            cwd,
            timeout,
            maxBuffer: 10 * 1024 * 1024,
        });
        return {
            command,
            stdout,
            stderr,
            exitCode: 0,
            duration: Date.now() - start,
        };
    } catch (err) {
        const e = err as NodeJS.ErrnoException & {
            stdout?: string;
            stderr?: string;
            code?: number | string;
        };
        return {
            command,
            stdout: e.stdout ?? '',
            stderr: e.stderr ?? String(err),
            exitCode: typeof e.code === 'number' ? e.code : 1,
            duration: Date.now() - start,
        };
    }
}

// ─── batMulti ────────────────────────────────────────────────────────────────

export async function batMulti(input: BatMultiInput): Promise<BatMultiOutput> {
    const cwd = input.cwd ?? process.cwd();
    const timeout = input.timeout ?? 30_000;

    const settled = await Promise.allSettled(
        input.commands.map((cmd) => runOne(cmd, cwd, timeout)),
    );

    const results: CommandResult[] = settled.map((s, i) => {
        if (s.status === 'fulfilled') return s.value;
        return {
            command: input.commands[i] ?? '',
            stdout: '',
            stderr: String(s.reason),
            exitCode: 1,
            duration: 0,
        };
    });

    return { results };
}

// ─── batSequential ───────────────────────────────────────────────────────────

export async function batSequential(input: BatSequentialInput): Promise<BatSequentialOutput> {
    const cwd = input.cwd ?? process.cwd();
    const timeout = input.timeout ?? 30_000;
    const continueOnError = input.continueOnError ?? false;

    const results: CommandResult[] = [];

    for (let i = 0; i < input.commands.length; i++) {
        const cmd = input.commands[i];
        if (cmd === undefined) continue;
        const result = await runOne(cmd, cwd, timeout);
        results.push(result);

        if (result.exitCode !== 0 && !continueOnError) {
            return { results, stoppedAt: i };
        }
    }

    return { results };
}

// ─── batParallel ─────────────────────────────────────────────────────────────

export async function batParallel(input: BatParallelInput): Promise<BatParallelOutput> {
    const cwd = input.cwd ?? process.cwd();
    const timeout = input.timeout ?? 30_000;
    const maxConcurrency = input.maxConcurrency ?? input.commands.length;

    const start = Date.now();
    const results: CommandResult[] = new Array(input.commands.length);
    const queue = [...input.commands.entries()];

    async function worker(): Promise<void> {
        while (queue.length > 0) {
            const entry = queue.shift();
            if (!entry) return;
            const [index, cmd] = entry;
            results[index] = await runOne(cmd, cwd, timeout);
        }
    }

    const concurrency = Math.max(1, Math.min(maxConcurrency, input.commands.length));
    const workers = Array.from({ length: concurrency }, () => worker());
    await Promise.all(workers);

    return { results, duration: Date.now() - start };
}

// ─── batPipeline ─────────────────────────────────────────────────────────────

export async function batPipeline(input: BatPipelineInput): Promise<BatPipelineOutput> {
    const cwd = input.cwd ?? process.cwd();
    const timeout = input.timeout ?? 30_000;

    const pipeCmd = input.commands.join(' | ');
    const start = Date.now();

    try {
        const { stdout, stderr } = await execFileAsync('sh', ['-c', pipeCmd], {
            cwd,
            timeout,
            maxBuffer: 10 * 1024 * 1024,
        });
        return { stdout, stderr, exitCode: 0, duration: Date.now() - start };
    } catch (err) {
        const e = err as NodeJS.ErrnoException & {
            stdout?: string;
            stderr?: string;
            code?: number | string;
        };
        return {
            stdout: e.stdout ?? '',
            stderr: e.stderr ?? String(err),
            exitCode: typeof e.code === 'number' ? e.code : 1,
            duration: Date.now() - start,
        };
    }
}
