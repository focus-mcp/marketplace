// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

// ──────────────────────────────────────────────────────────────────────────────
// Public types (API contract — DO NOT change shape)
// ──────────────────────────────────────────────────────────────────────────────

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

export interface IndexedFile {
    path: string;
    symbols: SymbolInfo[];
    imports: Array<{ from: string; names: string[] }>;
    exports: string[];
    mtime: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// Parser registry (side-effect registrations via imports)
// ──────────────────────────────────────────────────────────────────────────────

// These imports register language parsers into the global registry.
// Each file calls registerLanguage() on load.
import './parsers/typescript.ts';
import './parsers/php.ts';
import './parsers/python.ts';
import './parsers/go.ts';
import './parsers/rust.ts';
import './parsers/java.ts';
// New languages — @cursorless/tree-sitter-wasms bundle
import './parsers/yaml.ts';
import './parsers/html.ts';
import './parsers/markdown.ts';
import './parsers/scss.ts';
import './parsers/css.ts';
import './parsers/json.ts';
import './parsers/toml.ts';
import './parsers/twig.ts';
import './parsers/generic-lang.ts';

import { parseSource, supportedExtensions, supportedLanguageNames } from './parsers/registry.ts';

// ──────────────────────────────────────────────────────────────────────────────
// In-memory index
// ──────────────────────────────────────────────────────────────────────────────

export const indexStore = new Map<string, IndexedFile>();

// ──────────────────────────────────────────────────────────────────────────────
// Core parse entry point
// ──────────────────────────────────────────────────────────────────────────────

export async function parseFile(
    filePath: string,
    content: string,
    mtime: number,
): Promise<IndexedFile> {
    const ext = extname(filePath).toLowerCase();
    const result = await parseSource(content, filePath, ext);

    if (!result) {
        // Unsupported extension — return empty record
        return { path: filePath, symbols: [], imports: [], exports: [], mtime };
    }

    return {
        path: filePath,
        symbols: result.symbols,
        imports: result.imports,
        exports: result.exports,
        mtime,
    };
}

// ──────────────────────────────────────────────────────────────────────────────
// Internal bus service types  (treesitter:extract-* — consumed by code-intel bricks)
// ──────────────────────────────────────────────────────────────────────────────

export interface TsExtractSymbolsInput {
    /** Absolute or relative path — used only as metadata in SymbolInfo.file */
    readonly path: string;
    /** Raw file content to parse */
    readonly content: string;
}

export interface TsExtractSymbolsOutput {
    readonly symbols: SymbolInfo[];
    readonly imports: Array<{ from: string; names: string[] }>;
    readonly exports: string[];
}

/**
 * Parse a file and return structured symbol/import/export data.
 * This is an internal bus service used by code-intel bricks.
 * It does NOT index into the in-memory store — call tsIndex/tsReindex for that.
 */
export async function tsExtractSymbols(
    input: TsExtractSymbolsInput,
): Promise<TsExtractSymbolsOutput> {
    const indexed = await parseFile(input.path, input.content, 0);
    return {
        symbols: indexed.symbols,
        imports: indexed.imports,
        exports: indexed.exports,
    };
}

export interface TsSupportedExtsOutput {
    /** All file extensions registered in the tree-sitter language registry. */
    readonly exts: string[];
}

/**
 * Return all file extensions supported by the tree-sitter registry.
 * Consumed by code-intel bricks to dynamically filter which files to process.
 * Target: treesitter:supported-exts
 */
export function tsSupportedExts(): TsSupportedExtsOutput {
    return { exts: supportedExtensions() };
}

// ─── tsExtractImports ────────────────────────────────────────────────────────

export interface TsExtractImportsInput {
    readonly path: string;
    readonly content: string;
}

export interface ImportEntry {
    from: string;
    names: string[];
    kind?: string;
}

export interface TsExtractImportsOutput {
    readonly imports: ImportEntry[];
}

/**
 * Extract import statements from a file via tree-sitter.
 * Consumed by code-intel bricks (smartread, depgraph) via treesitter:extract-imports.
 */
export async function tsExtractImports(
    input: TsExtractImportsInput,
): Promise<TsExtractImportsOutput> {
    const indexed = await parseFile(input.path, input.content, 0);
    return { imports: indexed.imports };
}

// ─── tsExtractRefs ───────────────────────────────────────────────────────────

export interface TsExtractRefsInput {
    readonly path: string;
    readonly content: string;
    readonly name: string;
}

export interface RefEntry {
    name: string;
    line: number;
    col: number;
    kind: string;
}

export interface TsExtractRefsOutput {
    readonly refs: RefEntry[];
}

/**
 * Find all usages of `name` in a file (identifier matches, excluding declarations).
 * Consumed by refs brick via treesitter:extract-refs.
 */
export async function tsExtractRefs(input: TsExtractRefsInput): Promise<TsExtractRefsOutput> {
    const lines = input.content.split('\n');
    const refs: RefEntry[] = [];
    const escaped = input.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const wordRe = new RegExp(`\\b${escaped}\\b`, 'g');
    const declRe = new RegExp(
        `(?:function|class|interface|type|const|let|var|def|func|fn)\\s+${escaped}\\b`,
    );
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';
        if (declRe.test(line)) continue;
        wordRe.lastIndex = 0;
        let m = wordRe.exec(line);
        while (m !== null) {
            refs.push({ name: input.name, line: i + 1, col: m.index, kind: 'reference' });
            m = wordRe.exec(line);
        }
    }
    return { refs };
}

// ─── tsExtractCalls ──────────────────────────────────────────────────────────

export interface TsExtractCallsInput {
    readonly path: string;
    readonly content: string;
}

export interface CallEntry {
    caller: string;
    callee: string;
    line: number;
}

export interface TsExtractCallsOutput {
    readonly calls: CallEntry[];
}

const CALL_SKIP = new Set([
    'if',
    'for',
    'while',
    'switch',
    'catch',
    'function',
    'class',
    'return',
    'new',
    'typeof',
    'instanceof',
    'constructor',
]);

const FN_DECL_RE = /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/;
const CALL_RE = /\b(\w+)\s*\(/g;

function countBraces(line: string): number {
    return (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length;
}

function extractCallsFromLine(line: string, lineNum: number, callerFn: string): CallEntry[] {
    const entries: CallEntry[] = [];
    CALL_RE.lastIndex = 0;
    let m = CALL_RE.exec(line);
    while (m !== null) {
        const callee = m[1] ?? '';
        if (!CALL_SKIP.has(callee) && callee !== callerFn) {
            entries.push({ caller: callerFn, callee, line: lineNum });
        }
        m = CALL_RE.exec(line);
    }
    return entries;
}

/**
 * Extract caller→callee relationships for callgraph analysis.
 * Consumed by callgraph brick via treesitter:extract-calls.
 */
export async function tsExtractCalls(input: TsExtractCallsInput): Promise<TsExtractCallsOutput> {
    const lines = input.content.split('\n');
    const calls: CallEntry[] = [];
    let currentFn: string | undefined;
    let depth = 0;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';
        const fnMatch = FN_DECL_RE.exec(line.trimStart());
        if (fnMatch) {
            currentFn = fnMatch[1];
            depth = countBraces(line);
            if (depth <= 0) currentFn = undefined;
            continue;
        }
        if (currentFn) {
            depth += countBraces(line);
            calls.push(...extractCallsFromLine(line, i + 1, currentFn));
            if (depth <= 0) currentFn = undefined;
        }
    }
    return { calls };
}

// ─── tsExtractOutline ────────────────────────────────────────────────────────

export interface TsExtractOutlineInput {
    readonly path: string;
    readonly content: string;
}

export interface OutlineNode {
    name: string;
    kind: string;
    line: number;
    children?: OutlineNode[];
}

export interface TsExtractOutlineOutput {
    readonly outline: OutlineNode[];
}

/**
 * Build a hierarchical outline from the symbol tree.
 * Consumed by outline brick via treesitter:extract-outline.
 */
export async function tsExtractOutline(
    input: TsExtractOutlineInput,
): Promise<TsExtractOutlineOutput> {
    const indexed = await parseFile(input.path, input.content, 0);
    const outline: OutlineNode[] = [];
    const parentMap = new Map<string, OutlineNode>();

    for (const sym of indexed.symbols) {
        const node: OutlineNode = { name: sym.name, kind: sym.kind, line: sym.line };
        if (sym.parent) {
            const parent = parentMap.get(sym.parent);
            if (parent) {
                if (!parent.children) parent.children = [];
                parent.children.push(node);
                continue;
            }
        }
        outline.push(node);
        if (sym.kind === 'class' || sym.kind === 'interface') {
            parentMap.set(sym.name, node);
        }
    }
    return { outline };
}

// ──────────────────────────────────────────────────────────────────────────────
// MCP tool inputs
// ──────────────────────────────────────────────────────────────────────────────

export interface TsIndexInput {
    readonly dir: string;
}

export interface TsReindexInput {
    readonly path: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// MCP tool implementations
// ──────────────────────────────────────────────────────────────────────────────

export async function tsIndex(input: TsIndexInput): Promise<{ files: number; symbols: number }> {
    const abs = resolve(input.dir);
    const files = await collectFiles(abs);
    let symbolCount = 0;
    for (const f of files) {
        const content = await readFile(f, 'utf-8');
        const s = await stat(f);
        const indexed = await parseFile(f, content, s.mtimeMs);
        indexStore.set(f, indexed);
        symbolCount += indexed.symbols.length;
    }
    return { files: files.length, symbols: symbolCount };
}

export async function tsReindex(input: TsReindexInput): Promise<{ symbols: number }> {
    const abs = resolve(input.path);
    const content = await readFile(abs, 'utf-8');
    const s = await stat(abs);
    const indexed = await parseFile(abs, content, s.mtimeMs);
    indexStore.set(abs, indexed);
    return { symbols: indexed.symbols.length };
}

export function tsStatus(): { files: number; symbols: number; langs: string[] } {
    let symbols = 0;
    for (const f of indexStore.values()) symbols += f.symbols.length;
    return { files: indexStore.size, symbols, langs: tsLangs() };
}

export function tsCleanup(): { removed: number } {
    const count = indexStore.size;
    indexStore.clear();
    return { removed: count };
}

export function tsLangs(): string[] {
    return supportedLanguageNames();
}

// ──────────────────────────────────────────────────────────────────────────────
// File collection
// ──────────────────────────────────────────────────────────────────────────────

const SUPPORTED_EXTS = new Set(supportedExtensions());

async function collectFiles(dir: string): Promise<string[]> {
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
            if (SUPPORTED_EXTS.has(ext)) results.push(full);
        }
    }
    return results;
}
