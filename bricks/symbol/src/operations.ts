// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { readdir, readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

// ──────────────────────────────────────────────────────────────────────────────
// Bus interface (minimal subset needed by this brick)
// ──────────────────────────────────────────────────────────────────────────────

export interface SymbolBrickBus {
    request<TRequest = unknown, TResponse = unknown>(
        target: string,
        payload: TRequest,
    ): Promise<TResponse>;
}

// ──────────────────────────────────────────────────────────────────────────────
// Module-level bus injection (set on brick start, cleared on stop)
// ──────────────────────────────────────────────────────────────────────────────

let _bus: SymbolBrickBus | undefined;

export function setBus(bus: SymbolBrickBus): void {
    _bus = bus;
}

export function clearBus(): void {
    _bus = undefined;
    // Reset the extensions cache so the next start() fetches fresh data from treesitter
    _supportedExts = undefined;
}

function getBus(): SymbolBrickBus {
    if (!_bus) throw new Error('symbol: bus not initialized — brick must be started first');
    return _bus;
}

// ──────────────────────────────────────────────────────────────────────────────
// Public types
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Symbol metadata returned by this brick's tools.
 *
 * MUST match treesitter brick's SymbolInfo shape — this is the bus contract.
 * Any change here must be mirrored in bricks/treesitter/src/operations.ts.
 */
export interface SymbolInfo {
    name: string;
    kind: 'function' | 'class' | 'interface' | 'type' | 'variable' | 'method';
    file: string;
    line: number;
    endLine: number;
    signature: string;
    exported: boolean;
    parent?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// treesitter:extract-symbols response type (internal)
// ──────────────────────────────────────────────────────────────────────────────

interface ExtractSymbolsOutput {
    symbols: SymbolInfo[];
    imports: Array<{ from: string; names: string[] }>;
    exports: string[];
}

// ──────────────────────────────────────────────────────────────────────────────
// Supported extensions — fetched from treesitter:supported-exts (lazy, cached)
// ──────────────────────────────────────────────────────────────────────────────

let _supportedExts: Set<string> | undefined;

/**
 * Fetch the set of supported file extensions from the treesitter brick via bus.
 * Result is cached in-process. Falls back to a minimal TS/JS set if the bus is
 * unavailable (e.g. during unit tests with mock bus that doesn't implement this target).
 */
async function getSupportedExts(): Promise<Set<string>> {
    if (_supportedExts) return _supportedExts;
    const bus = _bus;
    if (!bus) return new Set(['.ts', '.tsx', '.js', '.jsx']);
    try {
        const { exts } = await bus.request<Record<never, never>, { exts: string[] }>(
            'treesitter:supported-exts',
            {},
        );
        _supportedExts = new Set(exts);
    } catch {
        // treesitter brick not started yet or running an older version — use safe fallback
        _supportedExts = new Set([
            '.ts',
            '.tsx',
            '.js',
            '.jsx',
            '.php',
            '.py',
            '.go',
            '.rs',
            '.java',
        ]);
    }
    return _supportedExts;
}

// ──────────────────────────────────────────────────────────────────────────────
// Core extraction via bus
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Extract symbols from a file by delegating to treesitter:extract-symbols.
 * Falls back to empty array if the file type is unsupported.
 */
export async function parseSymbols(filePath: string, content: string): Promise<SymbolInfo[]> {
    const bus = getBus();
    const result = await bus.request<{ path: string; content: string }, ExtractSymbolsOutput>(
        'treesitter:extract-symbols',
        { path: filePath, content },
    );
    return result.symbols;
}

// ──────────────────────────────────────────────────────────────────────────────
// File collection
// ──────────────────────────────────────────────────────────────────────────────

async function collectFiles(dir: string): Promise<string[]> {
    const exts = await getSupportedExts();
    const entries = await readdir(dir, { withFileTypes: true });
    const results: string[] = [];
    for (const e of entries) {
        if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'vendor') continue;
        const full = join(dir, e.name);
        if (e.isDirectory()) {
            const sub = await collectFiles(full);
            results.push(...sub);
        } else {
            const ext = extname(e.name).toLowerCase();
            if (exts.has(ext)) results.push(full);
        }
    }
    return results;
}

// ──────────────────────────────────────────────────────────────────────────────
// MCP tool input types
// ──────────────────────────────────────────────────────────────────────────────

export interface SymFindInput {
    readonly name: string;
    readonly dir: string;
}

export interface SymGetInput {
    readonly name: string;
    readonly dir: string;
}

export interface SymBulkInput {
    readonly names: readonly string[];
    readonly dir: string;
}

export interface SymBodyInput {
    readonly file: string;
    readonly startLine: number;
    readonly endLine: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// MCP tool implementations
// ──────────────────────────────────────────────────────────────────────────────

export async function symFind(input: SymFindInput): Promise<{ symbols: SymbolInfo[] }> {
    const abs = resolve(input.dir);
    const files = await collectFiles(abs);
    const found: SymbolInfo[] = [];
    for (const f of files) {
        try {
            const content = await readFile(f, 'utf-8');
            const syms = await parseSymbols(f, content);
            found.push(...syms.filter((s) => s.name.includes(input.name)));
        } catch {}
    }
    return { symbols: found };
}

export async function symGet(input: SymGetInput): Promise<{ symbol: SymbolInfo | null }> {
    const abs = resolve(input.dir);
    const files = await collectFiles(abs);
    for (const f of files) {
        try {
            const content = await readFile(f, 'utf-8');
            const syms = await parseSymbols(f, content);
            const found = syms.find((s) => s.name === input.name);
            if (found) return { symbol: found };
        } catch {}
    }
    return { symbol: null };
}

export async function symBulk(
    input: SymBulkInput,
): Promise<{ results: Record<string, SymbolInfo | null> }> {
    const abs = resolve(input.dir);
    const files = await collectFiles(abs);
    const allSyms: SymbolInfo[] = [];
    for (const f of files) {
        try {
            const content = await readFile(f, 'utf-8');
            allSyms.push(...(await parseSymbols(f, content)));
        } catch {}
    }
    const results: Record<string, SymbolInfo | null> = {};
    for (const name of input.names) {
        results[name] = allSyms.find((s) => s.name === name) ?? null;
    }
    return { results };
}

export async function symBody(input: SymBodyInput): Promise<{ lines: string[] }> {
    const content = await readFile(resolve(input.file), 'utf-8');
    const all = content.split('\n');
    return { lines: all.slice(input.startLine - 1, input.endLine) };
}
