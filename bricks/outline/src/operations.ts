// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { open, readdir } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Regex patterns ──────────────────────────────────────────────────────────

const rExportFunction = /^export\s+(async\s+)?function\s+(\w+)/;
const rExportClass = /^export\s+(default\s+)?class\s+(\w+)/;
const rExportInterface = /^export\s+interface\s+(\w+)/;
const rExportType = /^export\s+type\s+(\w+)/;
const rExportConst = /^export\s+const\s+(\w+)/;
const rImport = /^import\s+.*\s+from\s+['"]([^'"]+)['"]/;
const rNamedImport = /\{\s*([^}]+)\s*\}/;

const SUPPORTED_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs']);

// ─── Parsing ─────────────────────────────────────────────────────────────────

function parseLine(
    line: string,
    lineNum: number,
    symbols: SymbolEntry[],
    imports: ImportEntry[],
): void {
    const mImport = rImport.exec(line);
    if (mImport) {
        const from = mImport[1] ?? '';
        const mNamed = rNamedImport.exec(line);
        const names = mNamed
            ? (mNamed[1] ?? '')
                  .split(',')
                  .map((n) => n.trim().split(' as ')[0]?.trim() ?? '')
                  .filter(Boolean)
            : [];
        imports.push({ from, names });
        return;
    }

    const mFn = rExportFunction.exec(line);
    if (mFn) {
        symbols.push({
            name: mFn[2] ?? '',
            kind: 'function',
            line: lineNum,
            signature: line.trim(),
            exported: true,
        });
        return;
    }

    const mClass = rExportClass.exec(line);
    if (mClass) {
        symbols.push({
            name: mClass[2] ?? '',
            kind: 'class',
            line: lineNum,
            signature: line.trim(),
            exported: true,
        });
        return;
    }

    const mIface = rExportInterface.exec(line);
    if (mIface) {
        symbols.push({
            name: mIface[1] ?? '',
            kind: 'interface',
            line: lineNum,
            signature: line.trim(),
            exported: true,
        });
        return;
    }

    const mType = rExportType.exec(line);
    if (mType) {
        symbols.push({
            name: mType[1] ?? '',
            kind: 'type',
            line: lineNum,
            signature: line.trim(),
            exported: true,
        });
        return;
    }

    const mConst = rExportConst.exec(line);
    if (mConst) {
        symbols.push({
            name: mConst[1] ?? '',
            kind: 'variable',
            line: lineNum,
            signature: line.trim(),
            exported: true,
        });
    }
}

function parseContent(content: string): { symbols: SymbolEntry[]; imports: ImportEntry[] } {
    const symbols: SymbolEntry[] = [];
    const imports: ImportEntry[] = [];
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        parseLine(lines[i] ?? '', i + 1, symbols, imports);
    }
    return { symbols, imports };
}

// ─── outlineFile ─────────────────────────────────────────────────────────────

export async function outlineFile(input: OutlineFileInput): Promise<OutlineFileOutput> {
    const abs = resolve(input.path);
    const fh = await open(abs, 'r');
    try {
        const content = await fh.readFile('utf-8');
        const lineCount = content.split('\n').length;
        const { symbols, imports } = parseContent(content);
        return { symbols, imports, lineCount };
    } finally {
        await fh.close();
    }
}

// ─── outlineRepo ─────────────────────────────────────────────────────────────

async function collectCodeFiles(dir: string, max: number, results: string[]): Promise<void> {
    if (results.length >= max) return;
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        if (results.length >= max) break;
        const name = entry.name.toString();
        if (name.startsWith('.') || name === 'node_modules') continue;
        const full = join(dir, name);
        if (entry.isDirectory()) {
            await collectCodeFiles(full, max, results);
        } else if (SUPPORTED_EXTS.has(extname(name))) {
            results.push(full);
        }
    }
}

export async function outlineRepo(input: OutlineRepoInput): Promise<OutlineRepoOutput> {
    const abs = resolve(input.dir);
    const maxFiles = input.maxFiles ?? 100;
    const filePaths: string[] = [];
    await collectCodeFiles(abs, maxFiles, filePaths);

    const files: RepoFileEntry[] = [];
    let totalSymbols = 0;

    for (const fp of filePaths) {
        const fh = await open(fp, 'r');
        try {
            const content = await fh.readFile('utf-8');
            const lines = content.split('\n').length;
            const { symbols, imports } = parseContent(content);
            const exportCount = symbols.filter((s) => s.exported).length;
            files.push({
                path: relative(abs, fp),
                symbols: symbols.length,
                exports: exportCount,
                imports: imports.length,
                lines,
            });
            totalSymbols += symbols.length;
        } finally {
            await fh.close();
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
