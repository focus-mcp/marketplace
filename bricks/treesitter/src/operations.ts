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
