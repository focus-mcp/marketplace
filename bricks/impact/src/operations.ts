// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { open, readdir } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ImpAnalyzeInput {
    readonly file: string;
    readonly dir: string;
}

export interface DirectDependent {
    file: string;
    imports: string[];
}

export interface IndirectDependent {
    file: string;
    depth: number;
}

export interface ImpAnalyzeOutput {
    directDependents: DirectDependent[];
    indirectDependents: IndirectDependent[];
    totalAffected: number;
}

export interface ImpAffectedInput {
    readonly files: readonly string[];
    readonly dir: string;
}

export interface AffectedEntry {
    file: string;
    reason: string;
    depth: number;
}

export interface ImpAffectedOutput {
    affected: AffectedEntry[];
    count: number;
}

export interface ImpPropagateInput {
    readonly file: string;
    readonly dir: string;
    readonly maxDepth?: number;
}

export interface PropagateLevel {
    depth: number;
    files: string[];
}

export interface ImpPropagateOutput {
    levels: PropagateLevel[];
    totalReach: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SUPPORTED_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs']);
const rImport = /^(?:import|export)\s+.*\s+from\s+['"]([^'"]+)['"]/;

async function collectFiles(dir: string, results: string[]): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const name = entry.name.toString();
        if (name.startsWith('.') || name === 'node_modules') continue;
        const full = join(dir, name);
        if (entry.isDirectory()) {
            await collectFiles(full, results);
        } else if (SUPPORTED_EXTS.has(extname(name))) {
            results.push(full);
        }
    }
}

async function extractImports(filePath: string): Promise<string[]> {
    const fh = await open(filePath, 'r').catch(() => null);
    if (!fh) return [];
    try {
        const content = await fh.readFile('utf-8');
        const fileDir = dirname(filePath);
        const imports: string[] = [];
        for (const line of content.split('\n')) {
            const m = rImport.exec(line);
            if (!m?.[1]) continue;
            const spec = m[1];
            if (!spec.startsWith('.')) continue;
            const abs = resolve(fileDir, spec);
            imports.push(abs);
        }
        return imports;
    } finally {
        await fh.close();
    }
}

type ImportGraph = Map<string, string[]>;

async function buildImportGraph(dir: string): Promise<ImportGraph> {
    const files: string[] = [];
    await collectFiles(dir, files);
    const graph: ImportGraph = new Map();
    for (const fp of files) {
        const imports = await extractImports(fp);
        graph.set(fp, imports);
    }
    return graph;
}

function buildReverseGraph(graph: ImportGraph): Map<string, string[]> {
    const reverse = new Map<string, string[]>();
    for (const [file, imports] of graph) {
        for (const imp of imports) {
            // Match with or without extension
            const keys = [...graph.keys()].filter(
                (k) => k === imp || k.startsWith(`${imp}.`) || k.startsWith(`${imp}/index`),
            );
            for (const key of keys) {
                if (!reverse.has(key)) reverse.set(key, []);
                reverse.get(key)?.push(file);
            }
        }
    }
    return reverse;
}

function bfsReverse(
    start: string,
    reverseGraph: Map<string, string[]>,
    maxDepth: number,
): Map<string, number> {
    const visited = new Map<string, number>();
    const queue: Array<{ file: string; depth: number }> = [{ file: start, depth: 0 }];
    while (queue.length > 0) {
        const item = queue.shift();
        if (!item) continue;
        const { file, depth } = item;
        if (depth === 0) {
            visited.set(file, depth);
        }
        if (depth >= maxDepth) continue;
        const dependents = reverseGraph.get(file) ?? [];
        for (const dep of dependents) {
            if (!visited.has(dep)) {
                visited.set(dep, depth + 1);
                queue.push({ file: dep, depth: depth + 1 });
            }
        }
    }
    return visited;
}

// ─── impAnalyze ──────────────────────────────────────────────────────────────

export async function impAnalyze(input: ImpAnalyzeInput): Promise<ImpAnalyzeOutput> {
    const abs = resolve(input.file);
    const dir = resolve(input.dir);
    const graph = await buildImportGraph(dir);
    const reverse = buildReverseGraph(graph);

    const directFiles = reverse.get(abs) ?? [];
    const directDependents: DirectDependent[] = directFiles.map((f) => ({
        file: relative(dir, f),
        imports: [relative(dir, abs)],
    }));

    const reachable = bfsReverse(abs, reverse, 10);
    const indirectDependents: IndirectDependent[] = [];
    for (const [file, depth] of reachable) {
        if (file === abs || depth === 0) continue;
        if (!directFiles.includes(file)) {
            indirectDependents.push({ file: relative(dir, file), depth });
        }
    }

    return {
        directDependents,
        indirectDependents,
        totalAffected: directDependents.length + indirectDependents.length,
    };
}

// ─── impAffected ─────────────────────────────────────────────────────────────

export async function impAffected(input: ImpAffectedInput): Promise<ImpAffectedOutput> {
    const dir = resolve(input.dir);
    const graph = await buildImportGraph(dir);
    const reverse = buildReverseGraph(graph);

    const allAffected = new Map<string, AffectedEntry>();

    for (const rawFile of input.files) {
        const abs = resolve(rawFile);
        const reachable = bfsReverse(abs, reverse, 10);
        for (const [file, depth] of reachable) {
            if (file === abs) continue;
            if (!allAffected.has(file)) {
                allAffected.set(file, {
                    file: relative(dir, file),
                    reason: `imports ${relative(dir, abs)}`,
                    depth,
                });
            }
        }
    }

    const affected = [...allAffected.values()];
    return { affected, count: affected.length };
}

// ─── impPropagate ────────────────────────────────────────────────────────────

export async function impPropagate(input: ImpPropagateInput): Promise<ImpPropagateOutput> {
    const abs = resolve(input.file);
    const dir = resolve(input.dir);
    const maxDepth = input.maxDepth ?? 3;
    const graph = await buildImportGraph(dir);
    const reverse = buildReverseGraph(graph);

    const reachable = bfsReverse(abs, reverse, maxDepth);
    const levelMap = new Map<number, string[]>();

    for (const [file, depth] of reachable) {
        if (file === abs) continue;
        if (!levelMap.has(depth)) levelMap.set(depth, []);
        levelMap.get(depth)?.push(relative(dir, file));
    }

    const levels: PropagateLevel[] = [];
    for (let d = 1; d <= maxDepth; d++) {
        const files = levelMap.get(d);
        if (files && files.length > 0) {
            levels.push({ depth: d, files });
        }
    }

    const totalReach = [...reachable.keys()].filter((f) => f !== abs).length;
    return { levels, totalReach };
}
