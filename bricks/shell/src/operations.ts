// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import type { ChildProcess } from 'node:child_process';
import { execFile, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ShExecInput {
    readonly command: string;
    readonly cwd?: string;
    readonly timeout?: number;
    readonly env?: Record<string, string>;
}

export interface ShExecOutput {
    stdout: string;
    stderr: string;
    exitCode: number;
    duration: number;
}

export interface ShBackgroundInput {
    readonly command: string;
    readonly cwd?: string;
}

export interface ShBackgroundOutput {
    id: string;
    pid: number | undefined;
    command: string;
}

export interface ShKillInput {
    readonly id: string;
}

export interface ShKillOutput {
    killed: boolean;
    id: string;
}

export interface ShCompressInput {
    readonly command: string;
    readonly cwd?: string;
    readonly maxLines?: number;
    readonly timeout?: number;
}

export interface ShCompressOutput {
    output: string;
    lines: number;
    truncated: boolean;
}

// ─── Background process registry ─────────────────────────────────────────────

const backgroundProcesses = new Map<string, ChildProcess>();

export function getBackgroundProcesses(): Map<string, ChildProcess> {
    return backgroundProcesses;
}

// ─── shExec ──────────────────────────────────────────────────────────────────

export async function shExec(input: ShExecInput): Promise<ShExecOutput> {
    const timeout = input.timeout ?? 30000;
    const cwd = input.cwd ?? process.cwd();
    const env = input.env ? { ...process.env, ...input.env } : process.env;

    const start = Date.now();

    return new Promise((resolve) => {
        execFile(
            '/bin/sh',
            ['-c', input.command],
            { cwd, timeout, env, maxBuffer: 10 * 1024 * 1024 },
            (error, stdout, stderr) => {
                const duration = Date.now() - start;
                let exitCode = 0;

                if (error) {
                    if (
                        error.killed ||
                        error.signal === 'SIGTERM' ||
                        error.code === 'ETIMEDOUT' ||
                        duration >= timeout - 50
                    ) {
                        // Killed by timeout — use exit code 124 (same as bash `timeout` command)
                        exitCode = 124;
                    } else if (typeof error.code === 'number') {
                        exitCode = error.code;
                    } else {
                        exitCode = 1;
                    }
                }

                resolve({
                    stdout: stdout ?? '',
                    stderr: stderr ?? '',
                    exitCode,
                    duration,
                });
            },
        );
    });
}

// ─── shBackground ────────────────────────────────────────────────────────────

export function shBackground(input: ShBackgroundInput): ShBackgroundOutput {
    const id = randomUUID();
    const cwd = input.cwd ?? process.cwd();

    const child = spawn('/bin/sh', ['-c', input.command], {
        cwd,
        detached: true,
        stdio: 'ignore',
    });

    child.unref();
    backgroundProcesses.set(id, child);

    // Clean up map when process exits naturally
    child.on('exit', () => {
        backgroundProcesses.delete(id);
    });

    return {
        id,
        pid: child.pid,
        command: input.command,
    };
}

// ─── shKill ──────────────────────────────────────────────────────────────────

export function shKill(input: ShKillInput): ShKillOutput {
    const child = backgroundProcesses.get(input.id);

    if (!child) {
        return { killed: false, id: input.id };
    }

    try {
        child.kill('SIGTERM');
    } catch {
        // Process may have already exited
    }

    backgroundProcesses.delete(input.id);

    return { killed: true, id: input.id };
}

// ─── shCompress ──────────────────────────────────────────────────────────────

// Regex to strip ANSI escape codes
// biome-ignore lint/complexity/useRegexLiterals: RegExp ctor required to avoid noControlCharactersInRegex on ESC (\x1b)
const ANSI_ESCAPE = new RegExp('\\x1b(?:[@-Z\\\\-_]|\\[[0-?]*[ -/]*[@-~])', 'g');

export async function shCompress(input: ShCompressInput): Promise<ShCompressOutput> {
    const maxLines = input.maxLines ?? 100;

    const execInput: ShExecInput = {
        command: input.command,
        ...(input.cwd !== undefined ? { cwd: input.cwd } : {}),
        ...(input.timeout !== undefined ? { timeout: input.timeout } : {}),
    };

    const result = await shExec(execInput);

    const raw = result.stdout + (result.stderr ? `\n${result.stderr}` : '');

    // Strip ANSI escape codes
    const stripped = raw.replace(ANSI_ESCAPE, '');

    // Collapse consecutive blank lines into a single blank line
    const collapsed = stripped.replace(/\n{3,}/g, '\n\n');

    // Split into lines and filter trailing empty lines
    const allLines = collapsed.split('\n');

    // Remove leading/trailing empty lines
    let start = 0;
    let end = allLines.length - 1;
    while (start <= end && allLines[start]?.trim() === '') start++;
    while (end >= start && allLines[end]?.trim() === '') end--;

    const trimmed = allLines.slice(start, end + 1);
    const truncated = trimmed.length > maxLines;
    const finalLines = truncated ? trimmed.slice(0, maxLines) : trimmed;

    return {
        output: finalLines.join('\n'),
        lines: finalLines.length,
        truncated,
    };
}

// ─── killAllBackground ───────────────────────────────────────────────────────

export function killAllBackground(): void {
    for (const [id] of backgroundProcesses) {
        shKill({ id });
    }
}
