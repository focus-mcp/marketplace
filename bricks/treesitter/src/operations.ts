// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { readdir, readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';

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

export const indexStore = new Map<string, IndexedFile>();

const SUPPORTED_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx']);

const rExportFunction = /^export\s+(async\s+)?function\s+(\w+)/;
const rExportClass = /^export\s+(default\s+)?class\s+(\w+)/;
const rExportInterface = /^export\s+interface\s+(\w+)/;
const rExportType = /^export\s+type\s+(\w+)/;
const rExportConst = /^export\s+const\s+(\w+)/;
const rImport = /^import\s+.*\s+from\s+['"]([^'"]+)['"]/;
const rNamedImport = /\{\s*([^}]+)\s*\}/;
const rMethod = /^\s{4}(async\s+)?(\w+)\s*\(/;

interface ParseContext {
    filePath: string;
    symbols: SymbolInfo[];
    imports: Array<{ from: string; names: string[] }>;
    fileExports: string[];
    currentClass: string | undefined;
    classDepth: number;
}

function braceBalance(line: string): number {
    return (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length;
}

function parseImportLine(ctx: ParseContext, line: string): boolean {
    const mImport = rImport.exec(line);
    if (!mImport) return false;
    const from = mImport[1] ?? '';
    const mNamed = rNamedImport.exec(line);
    const names = mNamed
        ? (mNamed[1] ?? '')
              .split(',')
              .map((n) => n.trim().split(' as ')[0]?.trim() ?? '')
              .filter(Boolean)
        : [];
    ctx.imports.push({ from, names });
    return true;
}

function parseExportLine(ctx: ParseContext, line: string, lineNum: number): boolean {
    const mFn = rExportFunction.exec(line);
    if (mFn) {
        const name = mFn[2] ?? '';
        ctx.symbols.push({
            name,
            kind: 'function',
            file: ctx.filePath,
            line: lineNum,
            endLine: lineNum,
            signature: line.trim(),
            exported: true,
        });
        ctx.fileExports.push(name);
        return true;
    }
    const mClass = rExportClass.exec(line);
    if (mClass) {
        const name = mClass[2] ?? '';
        ctx.symbols.push({
            name,
            kind: 'class',
            file: ctx.filePath,
            line: lineNum,
            endLine: lineNum,
            signature: line.trim(),
            exported: true,
        });
        ctx.fileExports.push(name);
        ctx.currentClass = name;
        ctx.classDepth = braceBalance(line);
        return true;
    }
    const mIface = rExportInterface.exec(line);
    if (mIface) {
        const name = mIface[1] ?? '';
        ctx.symbols.push({
            name,
            kind: 'interface',
            file: ctx.filePath,
            line: lineNum,
            endLine: lineNum,
            signature: line.trim(),
            exported: true,
        });
        ctx.fileExports.push(name);
        return true;
    }
    const mType = rExportType.exec(line);
    if (mType) {
        const name = mType[1] ?? '';
        ctx.symbols.push({
            name,
            kind: 'type',
            file: ctx.filePath,
            line: lineNum,
            endLine: lineNum,
            signature: line.trim(),
            exported: true,
        });
        ctx.fileExports.push(name);
        return true;
    }
    const mConst = rExportConst.exec(line);
    if (mConst) {
        const name = mConst[1] ?? '';
        ctx.symbols.push({
            name,
            kind: 'variable',
            file: ctx.filePath,
            line: lineNum,
            endLine: lineNum,
            signature: line.trim(),
            exported: true,
        });
        ctx.fileExports.push(name);
        return true;
    }
    return false;
}

function parseMethodLine(ctx: ParseContext, line: string, lineNum: number): void {
    const mMethod = rMethod.exec(line);
    if (!mMethod) return;
    const name = mMethod[2] ?? '';
    if (name !== 'constructor' && !name.startsWith('_') && ctx.currentClass) {
        ctx.symbols.push({
            name,
            kind: 'method',
            file: ctx.filePath,
            line: lineNum,
            endLine: lineNum,
            signature: line.trim(),
            exported: false,
            parent: ctx.currentClass,
        });
    }
}

export function parseFile(filePath: string, content: string, mtime: number): IndexedFile {
    const lines = content.split('\n');
    const ctx: ParseContext = {
        filePath,
        symbols: [],
        imports: [],
        fileExports: [],
        currentClass: undefined,
        classDepth: 0,
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';
        const lineNum = i + 1;

        if (ctx.currentClass) {
            ctx.classDepth += braceBalance(line);
            if (ctx.classDepth <= 0) {
                ctx.currentClass = undefined;
                ctx.classDepth = 0;
            }
        }

        if (parseImportLine(ctx, line)) continue;
        if (parseExportLine(ctx, line, lineNum)) continue;
        if (ctx.currentClass) parseMethodLine(ctx, line, lineNum);
    }

    return {
        path: filePath,
        symbols: ctx.symbols,
        imports: ctx.imports,
        exports: ctx.fileExports,
        mtime,
    };
}

export interface TsIndexInput {
    readonly dir: string;
}

export interface TsReindexInput {
    readonly path: string;
}

export async function tsIndex(input: TsIndexInput): Promise<{ files: number; symbols: number }> {
    const abs = resolve(input.dir);
    const files = await collectFiles(abs);
    let symbolCount = 0;
    for (const f of files) {
        const s = await stat(f);
        const content = await readFile(f, 'utf-8');
        const indexed = parseFile(f, content, s.mtimeMs);
        indexStore.set(f, indexed);
        symbolCount += indexed.symbols.length;
    }
    return { files: files.length, symbols: symbolCount };
}

export async function tsReindex(input: TsReindexInput): Promise<{ symbols: number }> {
    const abs = resolve(input.path);
    const s = await stat(abs);
    const content = await readFile(abs, 'utf-8');
    const indexed = parseFile(abs, content, s.mtimeMs);
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
    return ['typescript', 'javascript'];
}

async function collectFiles(dir: string): Promise<string[]> {
    const entries = await readdir(dir, { withFileTypes: true });
    const results: string[] = [];
    for (const e of entries) {
        if (e.name.startsWith('.') || e.name === 'node_modules') continue;
        const full = join(dir, e.name);
        if (e.isDirectory()) {
            const sub = await collectFiles(full);
            results.push(...sub);
        } else {
            const ext = e.name.slice(e.name.lastIndexOf('.'));
            if (SUPPORTED_EXTS.has(ext)) results.push(full);
        }
    }
    return results;
}
