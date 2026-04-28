// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { open, readdir } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';

// ─── Bus interface ────────────────────────────────────────────────────────────

export interface OutlineBrickBus {
    request<TRequest = unknown, TResponse = unknown>(
        target: string,
        payload: TRequest,
    ): Promise<TResponse>;
}

// ─── Module-level bus injection ───────────────────────────────────────────────

const DEFAULT_EXTS = [
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.mts',
    '.mjs',
    '.php',
    '.py',
    '.go',
    '.rs',
    '.java',
] as const;

let _bus: OutlineBrickBus | undefined;
let _supportedExtsPromise: Promise<Set<string>> | undefined;

export function setBus(bus: OutlineBrickBus): void {
    _bus = bus;
    _supportedExtsPromise = undefined;
}

export function clearBus(): void {
    _bus = undefined;
    _supportedExtsPromise = undefined;
}

function getSupportedExts(): Promise<Set<string>> {
    if (_supportedExtsPromise) return _supportedExtsPromise;
    _supportedExtsPromise = (async () => {
        if (!_bus) return new Set(DEFAULT_EXTS);
        try {
            const { exts } = await _bus.request<object, { exts: string[] }>(
                'treesitter:supported-exts',
                {},
            );
            return new Set(exts);
        } catch {
            return new Set(DEFAULT_EXTS);
        }
    })();
    return _supportedExtsPromise;
}

// ─── Bus response types (MUST match treesitter brick's shapes — bus contract) ─

interface BusSymbolInfo {
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
    symbols: BusSymbolInfo[];
    imports: Array<{ from: string; names: string[] }>;
    exports: string[];
}

// ─── Public types ─────────────────────────────────────────────────────────────

export interface SymbolEntry {
    name: string;
    kind: 'function' | 'class' | 'interface' | 'type' | 'variable';
    line: number;
    signature: string;
    exported: boolean;
}

export interface ImportEntry {
    from: string;
    names: string[];
}

export interface OutlineFileInput {
    readonly path: string;
}

export interface OutlineFileOutput {
    symbols: SymbolEntry[];
    imports: ImportEntry[];
    lineCount: number;
}

export interface OutlineRepoInput {
    readonly dir: string;
    readonly maxFiles?: number;
}

export interface RepoFileEntry {
    path: string;
    symbols: number;
    exports: number;
    imports: number;
    lines: number;
}

export interface OutlineRepoOutput {
    files: RepoFileEntry[];
    totalFiles: number;
    totalSymbols: number;
}

export interface OutlineStructureInput {
    readonly dir: string;
    readonly maxDepth?: number;
}

export interface TreeEntry {
    path: string;
    files: number;
    dirs: number;
    extensions: Record<string, number>;
}

export interface OutlineStructureOutput {
    tree: TreeEntry[];
}

// ─── Regex fallback for parsing (used when bus unavailable) ───────────────────

const rExportFunction = /^export\s+(async\s+)?function\s+(\w+)/;
const rExportClass = /^export\s+(default\s+)?class\s+(\w+)/;
const rExportInterface = /^export\s+interface\s+(\w+)/;
const rExportType = /^export\s+type\s+(\w+)/;
const rExportConst = /^export\s+const\s+(\w+)/;
const rImport = /^import\s+.*\s+from\s+['"]([^'"]+)['"]/;
const rNamedImport = /\{\s*([^}]+)\s*\}/;

function parseImportLine(line: string): ImportEntry | undefined {
    const mImport = rImport.exec(line);
    if (!mImport) return undefined;
    const from = mImport[1] ?? '';
    const mNamed = rNamedImport.exec(line);
    const names = mNamed
        ? (mNamed[1] ?? '')
              .split(',')
              .map((n) => n.trim().split(' as ')[0]?.trim() ?? '')
              .filter(Boolean)
        : [];
    return { from, names };
}

function parseSymbolLine(line: string, lineNum: number): SymbolEntry | undefined {
    const mFn = rExportFunction.exec(line);
    if (mFn)
        return {
            name: mFn[2] ?? '',
            kind: 'function',
            line: lineNum,
            signature: line.trim(),
            exported: true,
        };
    const mClass = rExportClass.exec(line);
    if (mClass)
        return {
            name: mClass[2] ?? '',
            kind: 'class',
            line: lineNum,
            signature: line.trim(),
            exported: true,
        };
    const mIface = rExportInterface.exec(line);
    if (mIface)
        return {
            name: mIface[1] ?? '',
            kind: 'interface',
            line: lineNum,
            signature: line.trim(),
            exported: true,
        };
    const mType = rExportType.exec(line);
    if (mType)
        return {
            name: mType[1] ?? '',
            kind: 'type',
            line: lineNum,
            signature: line.trim(),
            exported: true,
        };
    const mConst = rExportConst.exec(line);
    if (mConst)
        return {
            name: mConst[1] ?? '',
            kind: 'variable',
            line: lineNum,
            signature: line.trim(),
            exported: true,
        };
    return undefined;
}

function parseContentFallback(content: string): { symbols: SymbolEntry[]; imports: ImportEntry[] } {
    const symbols: SymbolEntry[] = [];
    const imports: ImportEntry[] = [];
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';
        const importEntry = parseImportLine(line);
        if (importEntry) {
            imports.push(importEntry);
            continue;
        }
        const symbolEntry = parseSymbolLine(line, i + 1);
        if (symbolEntry) symbols.push(symbolEntry);
    }
    return { symbols, imports };
}

// ─── Shared symbol mapper ─────────────────────────────────────────────────────

const VALID_KINDS = new Set<string>(['function', 'class', 'interface', 'type', 'variable']);

function mapBusSymbols(raw: BusSymbolInfo[]): SymbolEntry[] {
    return raw
        .filter((s) => !s.parent && VALID_KINDS.has(s.kind))
        .map((s) => ({
            name: s.name,
            kind: s.kind as SymbolEntry['kind'],
            line: s.line,
            signature: s.signature,
            exported: s.exported,
        }));
}

// ─── File collection ──────────────────────────────────────────────────────────

async function collectCodeFiles(
    dir: string,
    max: number,
    results: string[],
    exts: Set<string>,
): Promise<void> {
    if (results.length >= max) return;
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        if (results.length >= max) break;
        const name = entry.name.toString();
        if (name.startsWith('.') || name === 'node_modules' || name === 'vendor') continue;
        const full = join(dir, name);
        if (entry.isDirectory()) {
            await collectCodeFiles(full, max, results, exts);
        } else if (exts.has(extname(name))) {
            results.push(full);
        }
    }
}

// ─── outlineFile ─────────────────────────────────────────────────────────────

export async function outlineFile(input: OutlineFileInput): Promise<OutlineFileOutput> {
    const abs = resolve(input.path);
    const fh = await open(abs, 'r');
    let content: string;
    try {
        content = await fh.readFile('utf-8');
    } finally {
        await fh.close();
    }
    const lineCount = content.split('\n').length;
    const bus = _bus;
    if (bus) {
        try {
            const [symbolsResult, importsResult] = await Promise.all([
                bus.request<{ path: string; content: string }, ExtractSymbolsOutput>(
                    'treesitter:extract-symbols',
                    { path: abs, content },
                ),
                bus.request<
                    { path: string; content: string },
                    { imports: Array<{ from: string; names: string[] }> }
                >('treesitter:extract-imports', { path: abs, content }),
            ]);
            return {
                symbols: mapBusSymbols(symbolsResult.symbols),
                imports: importsResult.imports,
                lineCount,
            };
        } catch {
            // fallback to regex on bus error
        }
    }
    const { symbols, imports } = parseContentFallback(content);
    return { symbols, imports, lineCount };
}

// ─── outlineRepo ─────────────────────────────────────────────────────────────

export async function outlineRepo(input: OutlineRepoInput): Promise<OutlineRepoOutput> {
    const abs = resolve(input.dir);
    const maxFiles = input.maxFiles ?? 100;
    const filePaths: string[] = [];
    const exts = await getSupportedExts();
    await collectCodeFiles(abs, maxFiles, filePaths, exts);

    const files: RepoFileEntry[] = [];
    let totalSymbols = 0;
    const bus = _bus;

    for (const fp of filePaths) {
        try {
            const fh = await open(fp, 'r');
            let content: string;
            try {
                content = await fh.readFile('utf-8');
            } finally {
                await fh.close();
            }
            const lines = content.split('\n').length;
            let symbols: SymbolEntry[] = [];
            let imports: ImportEntry[] = [];
            if (bus) {
                try {
                    const [symbolsResult, importsResult] = await Promise.all([
                        bus.request<{ path: string; content: string }, ExtractSymbolsOutput>(
                            'treesitter:extract-symbols',
                            { path: fp, content },
                        ),
                        bus.request<
                            { path: string; content: string },
                            { imports: Array<{ from: string; names: string[] }> }
                        >('treesitter:extract-imports', { path: fp, content }),
                    ]);
                    symbols = mapBusSymbols(symbolsResult.symbols);
                    imports = importsResult.imports;
                } catch {
                    const parsed = parseContentFallback(content);
                    symbols = parsed.symbols;
                    imports = parsed.imports;
                }
            } else {
                const parsed = parseContentFallback(content);
                symbols = parsed.symbols;
                imports = parsed.imports;
            }
            const exportCount = symbols.filter((s) => s.exported).length;
            files.push({
                path: relative(abs, fp),
                symbols: symbols.length,
                exports: exportCount,
                imports: imports.length,
                lines,
            });
            totalSymbols += symbols.length;
        } catch {
            // per-file error isolation
        }
    }

    return { files, totalFiles: files.length, totalSymbols };
}

// ─── outlineStructure ────────────────────────────────────────────────────────

async function collectTree(
    root: string,
    dir: string,
    depth: number,
    maxDepth: number,
    tree: TreeEntry[],
): Promise<void> {
    if (depth > maxDepth) return;
    let entries: import('node:fs').Dirent[];
    try {
        entries = await readdir(dir, { withFileTypes: true });
    } catch {
        return;
    }

    let fileCount = 0;
    let dirCount = 0;
    const extensions: Record<string, number> = {};
    const subdirs: string[] = [];

    for (const entry of entries) {
        const name = entry.name.toString();
        if (name.startsWith('.') || name === 'node_modules') continue;
        if (entry.isDirectory()) {
            dirCount++;
            subdirs.push(join(dir, name));
        } else {
            fileCount++;
            const ext = extname(name) || '(none)';
            extensions[ext] = (extensions[ext] ?? 0) + 1;
        }
    }

    if (depth > 0) {
        tree.push({
            path: relative(root, dir) || '.',
            files: fileCount,
            dirs: dirCount,
            extensions,
        });
    }

    for (const sub of subdirs) {
        await collectTree(root, sub, depth + 1, maxDepth, tree);
    }
}

export async function outlineStructure(
    input: OutlineStructureInput,
): Promise<OutlineStructureOutput> {
    const abs = resolve(input.dir);
    const maxDepth = input.maxDepth ?? 3;
    const tree: TreeEntry[] = [];
    await collectTree(abs, abs, 0, maxDepth, tree);
    return { tree };
}
