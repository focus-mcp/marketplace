// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { readFile } from 'node:fs/promises';
import { isAbsolute, normalize, resolve } from 'node:path';
import * as vm from 'node:vm';
import { transform } from 'esbuild';

// ─── Output size caps ────────────────────────────────────────────────────────

const MAX_LOG_LINES = 256; // truncate logs[] to N lines
const MAX_LINE_BYTES = 1024; // each log line capped
const MAX_CONTENT_BYTES = 16384; // for boxRead content
const MAX_RESULT_BYTES = 4096; // for serialized result

/**
 * Truncate a string to at most `maxBytes` UTF-8 bytes, appending a sentinel
 * when truncation occurs. Uses Buffer + TextDecoder to avoid splitting a
 * multi-byte code point.
 */
function truncateBytes(s: string, maxBytes: number): string {
    const bytes = Buffer.byteLength(s, 'utf8');
    if (bytes <= maxBytes) return s;
    const buf = Buffer.from(s, 'utf8');
    const sliced = buf.subarray(0, maxBytes);
    const decoded = new TextDecoder('utf-8', { fatal: false }).decode(sliced);
    return `${decoded}\n[truncated, original ${bytes} bytes]`;
}

/**
 * Cap a logs array: truncate each line to MAX_LINE_BYTES, then cap the array
 * to MAX_LOG_LINES entries (appending a sentinel if lines were dropped).
 */
function capLogs(logs: string[]): string[] {
    const capped = logs.map((line) => truncateBytes(line, MAX_LINE_BYTES));
    if (capped.length > MAX_LOG_LINES) {
        const dropped = capped.length - MAX_LOG_LINES;
        return [...capped.slice(0, MAX_LOG_LINES), `[truncated ${dropped} lines]`];
    }
    return capped;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BoxRunInput {
    readonly code: string;
    readonly timeout?: number;
}

export interface BoxRunOutput {
    result: string;
    logs: string[];
    duration: number;
    error?: string;
}

export interface BoxFileInput {
    readonly path: string;
    readonly timeout?: number;
}

export interface BoxFileOutput {
    result: string;
    logs: string[];
    duration: number;
    error?: string;
}

export interface BoxEvalInput {
    readonly expression: string;
    readonly timeout?: number;
}

export interface BoxEvalOutput {
    value: string;
    type: string;
    error?: string;
}

export interface LanguageEntry {
    name: string;
    supported: boolean;
    note?: string;
}

export interface BoxLanguagesOutput {
    languages: LanguageEntry[];
}

export interface BoxReadInput {
    readonly path: string;
}

export interface BoxReadOutput {
    content: string;
    path: string;
    error?: string;
}

// ─── TypeScript transpile helper ─────────────────────────────────────────────

/**
 * Transpile TypeScript source to JavaScript using esbuild.
 * Returns { code } on success or { error } on failure.
 */
async function transpileTs(source: string): Promise<{ code: string } | { error: string }> {
    try {
        const result = await transform(source, { loader: 'ts', target: 'es2022' });
        return { code: result.code };
    } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) };
    }
}

function looksLikeTypeScript(code: string): boolean {
    // Heuristic: presence of TS-only syntax patterns
    return /:\s*(string|number|boolean|void|any|unknown|never|object)\b|interface\s+\w|type\s+\w.*=|<\w+>|as\s+\w|readonly\s+\w|enum\s+\w/.test(
        code,
    );
}

// ─── boxRun ──────────────────────────────────────────────────────────────────

export async function boxRun(
    input: BoxRunInput & { readonly isTs?: boolean },
): Promise<BoxRunOutput> {
    const timeout = input.timeout ?? 5000;
    const logs: string[] = [];
    const start = Date.now();

    try {
        let code = input.code;

        // Transpile TypeScript to JavaScript when needed
        if (input.isTs === true || looksLikeTypeScript(code)) {
            const transpiled = await transpileTs(code);
            if ('error' in transpiled) {
                return {
                    result: 'undefined',
                    logs,
                    duration: Date.now() - start,
                    error: transpiled.error,
                };
            }
            code = transpiled.code;
        }

        const sandbox: vm.Context = {
            console: {
                log: (...args: unknown[]) => {
                    logs.push(truncateBytes(args.map((a) => String(a)).join(' '), MAX_LINE_BYTES));
                },
                error: (...args: unknown[]) => {
                    logs.push(
                        truncateBytes(
                            `[error] ${args.map((a) => String(a)).join(' ')}`,
                            MAX_LINE_BYTES,
                        ),
                    );
                },
                warn: (...args: unknown[]) => {
                    logs.push(
                        truncateBytes(
                            `[warn] ${args.map((a) => String(a)).join(' ')}`,
                            MAX_LINE_BYTES,
                        ),
                    );
                },
            },
            JSON,
            Math,
            Date,
            Array,
            Object,
            String,
            Number,
            Boolean,
            Map,
            Set,
            Promise,
            setTimeout,
            clearTimeout,
            undefined,
            NaN,
            Infinity,
            isNaN,
            isFinite,
            parseInt,
            parseFloat,
            encodeURIComponent,
            decodeURIComponent,
        };

        vm.createContext(sandbox);
        const script = new vm.Script(code);
        const raw = script.runInContext(sandbox, { timeout });
        const duration = Date.now() - start;

        let result: string;
        try {
            result = JSON.stringify(raw) ?? 'undefined';
        } catch {
            result = String(raw);
        }
        result = truncateBytes(result, MAX_RESULT_BYTES);

        return { result, logs: capLogs(logs), duration };
    } catch (err) {
        const duration = Date.now() - start;
        return {
            result: 'undefined',
            logs: capLogs(logs),
            duration,
            error: err instanceof Error ? err.message : String(err),
        };
    }
}

// ─── boxFile ─────────────────────────────────────────────────────────────────

export async function boxFile(input: BoxFileInput): Promise<BoxFileOutput> {
    try {
        const code = await readFile(input.path, 'utf-8');
        const isTs = input.path.endsWith('.ts') || input.path.endsWith('.tsx');
        return boxRun({
            code,
            ...(input.timeout !== undefined && { timeout: input.timeout }),
            ...(isTs && { isTs: true }),
        });
    } catch (err) {
        return {
            result: 'undefined',
            logs: [],
            duration: 0,
            error: err instanceof Error ? err.message : String(err),
        };
    }
}

// ─── boxEval ─────────────────────────────────────────────────────────────────

export async function boxEval(input: BoxEvalInput): Promise<BoxEvalOutput> {
    const timeout = input.timeout ?? 2000;

    try {
        let expression = input.expression;

        // Transpile TS expression when it contains TypeScript syntax
        if (looksLikeTypeScript(expression)) {
            const transpiled = await transpileTs(expression);
            if ('error' in transpiled) {
                return { value: 'undefined', type: 'undefined', error: transpiled.error };
            }
            expression = transpiled.code.trim();
        }

        const sandbox: vm.Context = {
            JSON,
            Math,
            Date,
            Array,
            Object,
            String,
            Number,
            Boolean,
            Map,
            Set,
            undefined,
            NaN,
            Infinity,
            isNaN,
            isFinite,
            parseInt,
            parseFloat,
        };

        vm.createContext(sandbox);
        const script = new vm.Script(`(${expression})`);
        const raw = script.runInContext(sandbox, { timeout });

        let value: string;
        try {
            value = JSON.stringify(raw) ?? 'undefined';
        } catch {
            value = String(raw);
        }

        return { value, type: typeof raw };
    } catch (err) {
        return {
            value: 'undefined',
            type: 'undefined',
            error: err instanceof Error ? err.message : String(err),
        };
    }
}

// ─── boxLanguages ─────────────────────────────────────────────────────────────

export function boxLanguages(): BoxLanguagesOutput {
    return {
        languages: [
            { name: 'javascript', supported: true },
            {
                name: 'typescript',
                supported: true,
                note: 'Transpiled via esbuild before VM execution',
            },
        ],
    };
}

// ─── boxRead ──────────────────────────────────────────────────────────────────

/** Resolve a relative/absolute path and validate it stays within cwd. */
function resolveSafePath(inputPath: string): { resolved: string } | { error: string } {
    // Reject absolute paths
    if (isAbsolute(inputPath)) {
        return {
            error: 'Absolute paths are not allowed. Use a relative path within the working directory.',
        };
    }
    // Reject obvious directory traversal attempts
    const normalised = normalize(inputPath);
    if (normalised.startsWith('..')) {
        return { error: 'Path must not escape the working directory (no leading ../).' };
    }
    const cwd = process.cwd();
    const resolved = resolve(cwd, normalised);
    // Double-check after resolve
    if (!resolved.startsWith(cwd + '/') && resolved !== cwd) {
        return { error: 'Path must not escape the working directory.' };
    }
    return { resolved };
}

export async function boxRead(input: BoxReadInput): Promise<BoxReadOutput> {
    const safe = resolveSafePath(input.path);
    if ('error' in safe) {
        return { content: '', path: input.path, error: safe.error };
    }
    try {
        const raw = await readFile(safe.resolved, 'utf-8');
        const content = truncateBytes(raw, MAX_CONTENT_BYTES);
        return { content, path: safe.resolved };
    } catch (err) {
        return {
            content: '',
            path: safe.resolved,
            error: err instanceof Error ? err.message : String(err),
        };
    }
}
