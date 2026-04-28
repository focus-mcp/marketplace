// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// ─── Bus interface ────────────────────────────────────────────────────────────

export interface SmartreadBrickBus {
    request<TRequest = unknown, TResponse = unknown>(
        target: string,
        payload: TRequest,
    ): Promise<TResponse>;
}

let _bus: SmartreadBrickBus | undefined;

export function setBus(bus: SmartreadBrickBus): void {
    _bus = bus;
}

export function clearBus(): void {
    _bus = undefined;
}

function getBus(): SmartreadBrickBus {
    if (!_bus) throw new Error('smartread: bus not initialized — brick must be started first');
    return _bus;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SrInput {
    readonly path: string;
}

export interface SrSummaryEntry {
    readonly name: string;
    readonly startLine: number;
    readonly endLine: number;
    readonly lineCount: number;
}

interface SymbolInfo {
    name: string;
    kind: string;
    file: string;
    line: number;
    endLine: number;
    signature: string;
    exported: boolean;
    parent?: string;
}

interface ExtractSymbolsOutput {
    symbols: SymbolInfo[];
    imports: Array<{ from: string; names: string[] }>;
    exports: string[];
}

interface ExtractImportsOutput {
    imports: Array<{ from: string; names: string[]; kind?: string }>;
}

// ─── srFull ───────────────────────────────────────────────────────────────────

export async function srFull(input: SrInput): Promise<{ content: string }> {
    const content = await readFile(resolve(input.path), 'utf-8');
    return { content };
}

// ─── srMap ────────────────────────────────────────────────────────────────────

export async function srMap(input: SrInput): Promise<{ lines: string[] }> {
    const content = await readFile(resolve(input.path), 'utf-8');
    try {
        const bus = getBus();
        const result = await bus.request<{ path: string; content: string }, ExtractSymbolsOutput>(
            'treesitter:extract-symbols',
            { path: resolve(input.path), content },
        );
        return { lines: result.symbols.map((s) => s.signature).filter(Boolean) };
    } catch {
        const pat = /^(export\s+)?(async\s+function|function|class|interface|type|const)\s+/;
        return { lines: content.split('\n').filter((l) => pat.test(l.trimStart())) };
    }
}

// ─── srSignatures ─────────────────────────────────────────────────────────────

export async function srSignatures(input: SrInput): Promise<{ lines: string[] }> {
    const content = await readFile(resolve(input.path), 'utf-8');
    try {
        const bus = getBus();
        const result = await bus.request<{ path: string; content: string }, ExtractSymbolsOutput>(
            'treesitter:extract-symbols',
            { path: resolve(input.path), content },
        );
        return {
            lines: result.symbols
                .filter((s) => s.exported)
                .map((s) => s.signature)
                .filter(Boolean),
        };
    } catch {
        const pat = /^export\s+(async\s+function|function|class|interface|type|const)\s+/;
        return { lines: content.split('\n').filter((l) => pat.test(l.trimStart())) };
    }
}

// ─── srImports ────────────────────────────────────────────────────────────────

export async function srImports(input: SrInput): Promise<{ lines: string[] }> {
    const content = await readFile(resolve(input.path), 'utf-8');
    try {
        const bus = getBus();
        const result = await bus.request<{ path: string; content: string }, ExtractImportsOutput>(
            'treesitter:extract-imports',
            { path: resolve(input.path), content },
        );
        return {
            lines: result.imports.map((imp) => {
                const names = imp.names.length > 0 ? `{ ${imp.names.join(', ')} }` : '*';
                return `import ${names} from '${imp.from}'`;
            }),
        };
    } catch {
        return {
            lines: content
                .split('\n')
                .filter((l) => /^import\s+/.test(l.trimStart()) || l.includes('require(')),
        };
    }
}

// ─── srSummary ────────────────────────────────────────────────────────────────

export async function srSummary(input: SrInput): Promise<{ entries: SrSummaryEntry[] }> {
    const content = await readFile(resolve(input.path), 'utf-8');
    try {
        const bus = getBus();
        const result = await bus.request<{ path: string; content: string }, ExtractSymbolsOutput>(
            'treesitter:extract-symbols',
            { path: resolve(input.path), content },
        );
        return {
            entries: result.symbols
                .filter((s) => !s.parent)
                .map((s) => ({
                    name: s.name,
                    startLine: s.line,
                    endLine: s.endLine,
                    lineCount: Math.max(1, s.endLine - s.line + 1),
                })),
        };
    } catch {
        return { entries: srSummaryFallback(content) };
    }
}

function srSummaryFallback(content: string): SrSummaryEntry[] {
    const BLOCK_START = /^(?:export\s+)?(?:async\s+)?(?:function|class)\s+(\w+)/;
    const allLines = content.split('\n');
    const entries: SrSummaryEntry[] = [];
    let i = 0;
    while (i < allLines.length) {
        const rawLine = allLines[i] ?? '';
        const match = BLOCK_START.exec(rawLine.trimStart());
        if (!match) {
            i++;
            continue;
        }
        const name = match[1];
        if (name === undefined) {
            i++;
            continue;
        }
        const startLine = i + 1;
        const endIdx = findBlockEnd(allLines, i);
        const endLine = endIdx + 1;
        entries.push({ name, startLine, endLine, lineCount: endLine - startLine + 1 });
        i = endIdx + 1;
    }
    return entries;
}

function findBlockEnd(allLines: string[], startIdx: number): number {
    let depth = 0;
    let foundOpen = false;
    for (let j = startIdx; j < allLines.length; j++) {
        const l = allLines[j] ?? '';
        for (const ch of l) {
            if (ch === '{') {
                depth++;
                foundOpen = true;
            } else if (ch === '}') {
                depth--;
            }
        }
        if (foundOpen && depth === 0) return j;
    }
    return startIdx;
}
