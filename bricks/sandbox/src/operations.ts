// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { readFile } from 'node:fs/promises';
import * as vm from 'node:vm';

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

// ─── boxRun ──────────────────────────────────────────────────────────────────

export function boxRun(input: BoxRunInput): BoxRunOutput {
    const timeout = input.timeout ?? 5000;
    const logs: string[] = [];
    const start = Date.now();

    try {
        const sandbox: vm.Context = {
            console: {
                log: (...args: unknown[]) => {
                    logs.push(args.map((a) => String(a)).join(' '));
                },
                error: (...args: unknown[]) => {
                    logs.push(`[error] ${args.map((a) => String(a)).join(' ')}`);
                },
                warn: (...args: unknown[]) => {
                    logs.push(`[warn] ${args.map((a) => String(a)).join(' ')}`);
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
        const script = new vm.Script(input.code);
        const raw = script.runInContext(sandbox, { timeout });
        const duration = Date.now() - start;

        let result: string;
        try {
            result = JSON.stringify(raw) ?? 'undefined';
        } catch {
            result = String(raw);
        }

        return { result, logs, duration };
    } catch (err) {
        const duration = Date.now() - start;
        return {
            result: 'undefined',
            logs,
            duration,
            error: err instanceof Error ? err.message : String(err),
        };
    }
}

// ─── boxFile ─────────────────────────────────────────────────────────────────

export async function boxFile(input: BoxFileInput): Promise<BoxFileOutput> {
    try {
        const code = await readFile(input.path, 'utf-8');
        return boxRun({ code, ...(input.timeout !== undefined && { timeout: input.timeout }) });
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

export function boxEval(input: BoxEvalInput): BoxEvalOutput {
    const timeout = input.timeout ?? 2000;

    try {
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
        const script = new vm.Script(`(${input.expression})`);
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
                supported: false,
                note: 'Planned — requires transpilation step',
            },
        ],
    };
}
