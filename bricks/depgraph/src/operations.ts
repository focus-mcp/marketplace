// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

const SUPPORTED_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx']);
const RELATIVE_EXTS = ['.ts', '.tsx', '.js', '.jsx'] as const;

async function collectFiles(dir: string): Promise<string[]> {
    const entries = await readdir(dir, { withFileTypes: true });
    const results: string[] = [];
    for (const e of entries) {
        if (e.name.startsWith('.') || e.name === 'node_modules') continue;
        const full = join(dir, e.name);
        if (e.isDirectory()) {
            results.push(...(await collectFiles(full)));
        } else {
            const ext = e.name.slice(e.name.lastIndexOf('.'));
            if (SUPPORTED_EXTS.has(ext)) results.push(full);
        }
    }
    return results;
}

export interface ImportInfo {
    from: string;
    names: string[];
    kind: 'esm' | 'cjs';
}

export interface DepImportsInput {
    readonly file: string;
}
export interface DepExportsInput {
    readonly file: string;
}
export interface DepCircularInput {
    readonly dir: string;
}
export interface DepFaninInput {
    readonly file: string;
    readonly dir: string;
}
export interface DepFanoutInput {
    readonly file: string;
}

const rEsmImport = /^import\s+.*\s+from\s+['"]([^'"]+)['"]/;
const rCjsRequire = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/;
const rNamedImport = /\{\s*([^}]+)\s*\}/;

export function parseImports(content: string): ImportInfo[] {
    const imports: ImportInfo[] = [];
    for (const line of content.split('\n')) {
        const mEsm = rEsmImport.exec(line);
        if (mEsm) {
            const from = mEsm[1] ?? '';
            const mNamed = rNamedImport.exec(line);
            const names = mNamed
                ? (mNamed[1] ?? '')
                      .split(',')
                      .map((n) => n.trim().split(' as ')[0]?.trim() ?? '')
                      .filter(Boolean)
                : [];
            imports.push({ from, names, kind: 'esm' });
            continue;
        }
        const mCjs = rCjsRequire.exec(line);
        if (mCjs) imports.push({ from: mCjs[1] ?? '', names: [], kind: 'cjs' });
    }
    return imports;
}

const rExport = /^export\s+(?:(?:async\s+)?function|class|interface|type|const|let|var)\s+(\w+)/;
const rReExport = /^export\s+\{([^}]+)\}/;

export function parseExports(content: string): string[] {
    const fileExports: string[] = [];
    for (const line of content.split('\n')) {
        const mExport = rExport.exec(line);
        if (mExport) {
            fileExports.push(mExport[1] ?? '');
            continue;
        }
        const mRe = rReExport.exec(line);
        if (mRe) {
            fileExports.push(
                ...(mRe[1] ?? '')
                    .split(',')
                    .map((n) => n.trim().split(' as ').pop()?.trim() ?? '')
                    .filter(Boolean),
            );
        }
    }
    return fileExports;
}

/** Resolve a relative import specifier to a file in the files set */
function resolveImport(from: string, baseDir: string, files: ReadonlySet<string>): string | null {
    const candidate = join(baseDir, from);
    if (files.has(candidate)) return candidate;
    for (const ext of RELATIVE_EXTS) {
        if (files.has(`${candidate}${ext}`)) return `${candidate}${ext}`;
        if (files.has(`${candidate}/index${ext}`)) return `${candidate}/index${ext}`;
    }
    return null;
}

function buildDepGraph(files: string[], contents: Map<string, string>): Map<string, Set<string>> {
    const fileSet = new Set(files);
    const graph = new Map<string, Set<string>>();
    for (const f of files) {
        const deps = new Set<string>();
        const base = dirname(f);
        for (const imp of parseImports(contents.get(f) ?? '')) {
            if (!imp.from.startsWith('.')) continue;
            const resolved = resolveImport(imp.from, base, fileSet);
            if (resolved) deps.add(resolved);
        }
        graph.set(f, deps);
    }
    return graph;
}

function detectCycles(graph: Map<string, Set<string>>, files: string[]): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const stack = new Set<string>();

    function dfs(node: string, path: string[]): void {
        if (stack.has(node)) {
            const start = path.indexOf(node);
            if (start !== -1) cycles.push([...path.slice(start), node]);
            return;
        }
        if (visited.has(node)) return;
        visited.add(node);
        stack.add(node);
        path.push(node);
        for (const dep of graph.get(node) ?? []) dfs(dep, path);
        path.pop();
        stack.delete(node);
    }

    for (const f of files) dfs(f, []);
    return cycles;
}

export async function depImports(input: DepImportsInput): Promise<{ imports: ImportInfo[] }> {
    const content = await readFile(resolve(input.file), 'utf-8');
    return { imports: parseImports(content) };
}

export async function depExports(input: DepExportsInput): Promise<{ exports: string[] }> {
    const content = await readFile(resolve(input.file), 'utf-8');
    return { exports: parseExports(content) };
}

export async function depCircular(input: DepCircularInput): Promise<{ cycles: string[][] }> {
    const abs = resolve(input.dir);
    const files = await collectFiles(abs);
    const contents = new Map<string, string>();
    for (const f of files) contents.set(f, await readFile(f, 'utf-8'));
    const graph = buildDepGraph(files, contents);
    return { cycles: detectCycles(graph, files) };
}

function fileImportsTarget(
    content: string,
    sourceFile: string,
    target: string,
    allFiles: ReadonlySet<string>,
): boolean {
    const base = dirname(sourceFile);
    for (const imp of parseImports(content)) {
        if (!imp.from.startsWith('.')) continue;
        const resolved = resolveImport(imp.from, base, allFiles);
        if (resolved === target) return true;
    }
    return false;
}

export async function depFanin(input: DepFaninInput): Promise<{ fanin: string[]; count: number }> {
    const abs = resolve(input.dir);
    const target = resolve(input.file);
    const files = await collectFiles(abs);
    const fileSet = new Set(files);
    const fanin: string[] = [];
    for (const f of files) {
        if (f === target) continue;
        const content = await readFile(f, 'utf-8');
        if (fileImportsTarget(content, f, target, fileSet)) fanin.push(f);
    }
    return { fanin, count: fanin.length };
}

export async function depFanout(
    input: DepFanoutInput,
): Promise<{ fanout: number; imports: ImportInfo[] }> {
    const content = await readFile(resolve(input.file), 'utf-8');
    const imports = parseImports(content);
    return { fanout: imports.length, imports };
}
