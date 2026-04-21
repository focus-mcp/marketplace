// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export interface SymbolInfo {
    name: string;
    kind: 'function' | 'class' | 'interface' | 'type' | 'variable' | 'method';
    file: string;
    line: number;
    signature: string;
    exported: boolean;
}

const SUPPORTED_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx']);

const rExportFunction = /^export\s+(async\s+)?function\s+(\w+)/;
const rExportClass = /^export\s+(default\s+)?class\s+(\w+)/;
const rExportInterface = /^export\s+interface\s+(\w+)/;
const rExportType = /^export\s+type\s+(\w+)/;
const rExportConst = /^export\s+const\s+(\w+)/;

function matchSymbol(filePath: string, line: string, lineNum: number): SymbolInfo | null {
    const mFn = rExportFunction.exec(line);
    if (mFn)
        return {
            name: mFn[2] ?? '',
            kind: 'function',
            file: filePath,
            line: lineNum,
            signature: line.trim(),
            exported: true,
        };
    const mClass = rExportClass.exec(line);
    if (mClass)
        return {
            name: mClass[2] ?? '',
            kind: 'class',
            file: filePath,
            line: lineNum,
            signature: line.trim(),
            exported: true,
        };
    const mIface = rExportInterface.exec(line);
    if (mIface)
        return {
            name: mIface[1] ?? '',
            kind: 'interface',
            file: filePath,
            line: lineNum,
            signature: line.trim(),
            exported: true,
        };
    const mType = rExportType.exec(line);
    if (mType)
        return {
            name: mType[1] ?? '',
            kind: 'type',
            file: filePath,
            line: lineNum,
            signature: line.trim(),
            exported: true,
        };
    const mConst = rExportConst.exec(line);
    if (mConst)
        return {
            name: mConst[1] ?? '',
            kind: 'variable',
            file: filePath,
            line: lineNum,
            signature: line.trim(),
            exported: true,
        };
    return null;
}

export function parseSymbols(filePath: string, content: string): SymbolInfo[] {
    const lines = content.split('\n');
    const symbols: SymbolInfo[] = [];
    for (let i = 0; i < lines.length; i++) {
        const sym = matchSymbol(filePath, lines[i] ?? '', i + 1);
        if (sym) symbols.push(sym);
    }
    return symbols;
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

export async function symFind(input: SymFindInput): Promise<{ symbols: SymbolInfo[] }> {
    const abs = resolve(input.dir);
    const files = await collectFiles(abs);
    const found: SymbolInfo[] = [];
    for (const f of files) {
        const content = await readFile(f, 'utf-8');
        const syms = parseSymbols(f, content);
        found.push(...syms.filter((s) => s.name.includes(input.name)));
    }
    return { symbols: found };
}

export async function symGet(input: SymGetInput): Promise<{ symbol: SymbolInfo | null }> {
    const abs = resolve(input.dir);
    const files = await collectFiles(abs);
    for (const f of files) {
        const content = await readFile(f, 'utf-8');
        const syms = parseSymbols(f, content);
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
        allSyms.push(...parseSymbols(f, content));
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
