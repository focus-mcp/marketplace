// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import type { SymbolInfo } from '../operations.ts';

const _require = createRequire(import.meta.url);

// Resolve the wasm dir via require.resolve to be robust under any CWD or Vitest mode
const _treeSitterJsPath: string = _require.resolve('@vscode/tree-sitter-wasm/wasm/tree-sitter.js');
const WASM_DIR: string = dirname(_treeSitterJsPath);

// ──────────────────────────────────────────────────────────────────────────────
// Type stubs for @vscode/tree-sitter-wasm (UMD CJS module)
// ──────────────────────────────────────────────────────────────────────────────

export interface TsNode {
    readonly type: string;
    readonly text: string;
    readonly startPosition: { row: number; column: number };
    readonly endPosition: { row: number; column: number };
    readonly childCount: number;
    readonly children: TsNode[];
    readonly isNamed: boolean;
    child(index: number): TsNode | null;
    childForFieldName(fieldName: string): TsNode | null;
    descendantsOfType(type: string): TsNode[];
}

interface TsTree {
    readonly rootNode: TsNode;
}

interface TsLanguage {
    readonly version: number;
}

interface TsParser {
    setLanguage(lang: TsLanguage): void;
    parse(source: string): TsTree;
}

interface TsParserStatic {
    init(opts: { locateFile: (name: string) => string }): Promise<void>;
    new (): TsParser;
}

interface TsLanguageStatic {
    load(path: string): Promise<TsLanguage>;
}

interface VsCodeTreeSitter {
    Parser: TsParserStatic;
    Language: TsLanguageStatic;
}

// ──────────────────────────────────────────────────────────────────────────────
// Init (singleton, lazy)
// ──────────────────────────────────────────────────────────────────────────────

let _parserModule: VsCodeTreeSitter | null = null;
let _initPromise: Promise<void> | null = null;

async function ensureInit(): Promise<VsCodeTreeSitter> {
    if (_parserModule) return _parserModule;
    if (!_initPromise) {
        _initPromise = (async () => {
            const mod = _require(_treeSitterJsPath) as VsCodeTreeSitter;
            await mod.Parser.init({
                locateFile: (name: string) => join(WASM_DIR, name),
            });
            _parserModule = mod;
        })();
    }
    await _initPromise;
    if (!_parserModule) throw new Error('tree-sitter init failed');
    return _parserModule;
}

// ──────────────────────────────────────────────────────────────────────────────
// Language cache
// ──────────────────────────────────────────────────────────────────────────────

// Store Promises (not values) to prevent double-load on concurrent first calls
const _langPromiseCache = new Map<string, Promise<TsLanguage>>();

async function loadLanguage(wasmName: string): Promise<TsLanguage> {
    let p = _langPromiseCache.get(wasmName);
    if (!p) {
        p = (async () => {
            const { Language } = await ensureInit();
            return Language.load(join(WASM_DIR, wasmName));
        })();
        _langPromiseCache.set(wasmName, p);
    }
    return p;
}

// ──────────────────────────────────────────────────────────────────────────────
// Public API for parsers
// ──────────────────────────────────────────────────────────────────────────────

export interface ParseResult {
    symbols: SymbolInfo[];
    imports: Array<{ from: string; names: string[] }>;
    exports: string[];
}

export type LanguageParser = (
    source: string,
    filePath: string,
    parser: TsParser,
    lang: TsLanguage,
    mod: VsCodeTreeSitter,
) => ParseResult;

interface LangEntry {
    wasmName: string;
    parse: LanguageParser;
}

const _registry = new Map<string, LangEntry>();

export function registerLanguage(
    extensions: string[],
    wasmName: string,
    parse: LanguageParser,
): void {
    for (const ext of extensions) {
        _registry.set(ext, { wasmName, parse });
    }
}

export function supportedExtensions(): string[] {
    return [..._registry.keys()];
}

// Maps wasm grammar names to canonical language names
const WASM_TO_LANG: Record<string, string> = {
    'tree-sitter-typescript.wasm': 'typescript',
    'tree-sitter-tsx.wasm': 'typescript', // tsx uses the same typescript grammar variant
    'tree-sitter-javascript.wasm': 'javascript',
    'tree-sitter-php.wasm': 'php',
    'tree-sitter-python.wasm': 'python',
    'tree-sitter-go.wasm': 'go',
    'tree-sitter-rust.wasm': 'rust',
    'tree-sitter-java.wasm': 'java',
};

export function supportedLanguageNames(): string[] {
    const seen = new Set<string>();
    for (const entry of _registry.values()) {
        const lang =
            WASM_TO_LANG[entry.wasmName] ??
            entry.wasmName.replace('tree-sitter-', '').replace('.wasm', '');
        seen.add(lang);
    }
    return [...seen].sort();
}

export async function parseSource(
    source: string,
    filePath: string,
    ext: string,
): Promise<ParseResult | null> {
    const entry = _registry.get(ext);
    if (!entry) return null;

    const mod = await ensureInit();
    const lang = await loadLanguage(entry.wasmName);
    const parser = new mod.Parser();
    parser.setLanguage(lang);

    return entry.parse(source, filePath, parser, lang, mod);
}
