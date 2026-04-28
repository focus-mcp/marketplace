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
}

function getBus(): SymbolBrickBus {
    if (!_bus) throw new Error('symbol: bus not initialized — brick must be started first');
    return _bus;
}

// ──────────────────────────────────────────────────────────────────────────────
// Public types
// ──────────────────────────────────────────────────────────────────────────────

// SymbolInfo shape mirrors treesitter:extract-symbols output (superset of old shape)
export interface SymbolInfo {
    name: string;
    kind: 'function' | 'class' | 'interface' | 'type' | 'variable' | 'method';
    file: string;
    line: number;
    endLine?: number;
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
// treesitter:langs response type (internal)
// ──────────────────────────────────────────────────────────────────────────────

// Cached supported extensions from treesitter (populated lazily)
let _supportedExts: Set<string> | undefined;

async function getSupportedExts(): Promise<Set<string>> {
    if (_supportedExts) return _supportedExts;
    // Fallback to TS/JS only if bus is not yet available (e.g. in some test scenarios)
    const bus = _bus;
    if (!bus) return new Set(['.ts', '.tsx', '.js', '.jsx']);
    try {
        const { langs } = await bus.request<Record<string, never>, { langs: string[] }>(
            'treesitter:langs',
            {},
        );
        // langs returns language names; we need extensions — fetch from status or use a static map
        // Since treesitter:langs returns names not extensions, we use a comprehensive hardcoded map
        // that mirrors treesitter's registry.
        void langs; // acknowledged but we use the ext map directly
    } catch {
        // ignore — fall through to static map
    }
    _supportedExts = KNOWN_CODE_EXTS;
    return _supportedExts;
}

// Static extension set that mirrors treesitter's parsers (updated when new langs are added)
const KNOWN_CODE_EXTS = new Set([
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.mjs',
    '.cjs',
    '.php',
    '.py',
    '.go',
    '.rs',
    '.java',
    '.kt',
    '.kotlin',
    '.swift',
    '.dart',
    '.ex',
    '.exs',
    '.hs',
    '.scala',
    '.zig',
    '.lua',
    '.rb',
    '.cs',
    '.c',
    '.h',
    '.cpp',
    '.cc',
    '.cxx',
    '.hpp',
    '.r',
    '.pl',
    '.pm',
    '.el',
    '.clj',
    '.cljs',
    '.edn',
    '.gd',
    '.gleam',
    '.elm',
    '.nix',
    '.hcl',
    '.tf',
]);

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
        const content = await readFile(f, 'utf-8');
        const syms = await parseSymbols(f, content);
        found.push(...syms.filter((s) => s.name.includes(input.name)));
    }
    return { symbols: found };
}

export async function symGet(input: SymGetInput): Promise<{ symbol: SymbolInfo | null }> {
    const abs = resolve(input.dir);
    const files = await collectFiles(abs);
    for (const f of files) {
        const content = await readFile(f, 'utf-8');
        const syms = await parseSymbols(f, content);
        const found = syms.find((s) => s.name === input.name);
        if (found) return { symbol: found };
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
        const content = await readFile(f, 'utf-8');
        allSyms.push(...(await parseSymbols(f, content)));
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
