// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { open } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SourceInfo {
    path: string;
    exports: string[];
    imports: string[];
    types: string[];
    functions: string[];
}

export interface RshMultisourceInput {
    readonly paths: readonly string[];
}

export interface RshMultisourceOutput {
    sources: SourceInfo[];
}

export interface RshSynthesizeInput {
    readonly sources: readonly SourceInfo[];
}

export interface SynthesizeOutput {
    sharedTypes: string[];
    commonDeps: string[];
    apiSurface: string[];
    connections: Array<{ from: string; to: string; via: string }>;
}

export interface ValidationIssue {
    type: 'missing-dep' | 'circular-ref' | 'undefined-type';
    message: string;
    files: string[];
}

export interface RshValidateInput {
    readonly sources: readonly SourceInfo[];
}

export interface RshValidateOutput {
    issues: ValidationIssue[];
    valid: boolean;
}

// ─── Regex patterns ──────────────────────────────────────────────────────────

const rExportNamed = /^export\s+(?:function|class|const|let|var|type|interface|enum)\s+(\w+)/gm;
const rExportDefault = /^export\s+default\s+(?:function|class)\s+(\w+)/gm;
const rExportBrace = /^export\s+\{([^}]+)\}/gm;
const rImport = /^import\s+.*\s+from\s+['"]([^'"]+)['"]/gm;
const rTypeOrInterface = /^(?:export\s+)?(?:type|interface)\s+(\w+)/gm;
const rFunctionSig = /^(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/gm;
const rArrowExport = /^export\s+const\s+(\w+)\s*=\s*(?:async\s+)?\(/gm;

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function readFileContent(filePath: string): Promise<string | null> {
    const fh = await open(filePath, 'r').catch(() => null);
    if (!fh) return null;
    try {
        return await fh.readFile('utf-8');
    } finally {
        await fh.close();
    }
}

function collectMatches(re: RegExp, content: string): string[] {
    const results: string[] = [];
    re.lastIndex = 0;
    let m = re.exec(content);
    while (m !== null) {
        if (m[1]) results.push(m[1]);
        m = re.exec(content);
    }
    return results;
}

function extractBraceExports(content: string): string[] {
    const braced: string[] = [];
    rExportBrace.lastIndex = 0;
    let m = rExportBrace.exec(content);
    while (m !== null) {
        if (m[1]) {
            const names = m[1].split(',').map(
                (s) =>
                    s
                        .trim()
                        .split(/\s+as\s+/)
                        .pop()
                        ?.trim() ?? '',
            );
            for (const name of names) {
                if (name) braced.push(name);
            }
        }
        m = rExportBrace.exec(content);
    }
    return braced;
}

function extractExports(content: string): string[] {
    const named = collectMatches(rExportNamed, content);
    const defaults = collectMatches(rExportDefault, content);
    const braced = extractBraceExports(content);
    return [...new Set([...named, ...defaults, ...braced])];
}

function extractImports(content: string): string[] {
    return [...new Set(collectMatches(rImport, content))];
}

function extractTypes(content: string): string[] {
    return [...new Set(collectMatches(rTypeOrInterface, content))];
}

function extractFunctions(content: string): string[] {
    const fns = collectMatches(rFunctionSig, content);
    const arrows = collectMatches(rArrowExport, content);
    return [...new Set([...fns, ...arrows])];
}

function resolveSource(
    imp: string,
    sources: readonly SourceInfo[],
    currentPath: string,
): SourceInfo | undefined {
    if (!imp.startsWith('.')) {
        return undefined;
    }
    const absBase = resolve(dirname(currentPath), imp);
    return sources.find((other) => {
        if (other.path === currentPath) return false;
        const otherBase = other.path.replace(/\.(ts|tsx|js|jsx|mts|mjs)$/, '');
        return otherBase === absBase || otherBase === `${absBase}/index`;
    });
}

// ─── rshMultisource ──────────────────────────────────────────────────────────

export async function rshMultisource(input: RshMultisourceInput): Promise<RshMultisourceOutput> {
    const sources: SourceInfo[] = [];

    for (const path of input.paths) {
        const content = await readFileContent(path);
        if (content === null) {
            sources.push({ path, exports: [], imports: [], types: [], functions: [] });
            continue;
        }
        sources.push({
            path,
            exports: extractExports(content),
            imports: extractImports(content),
            types: extractTypes(content),
            functions: extractFunctions(content),
        });
    }

    return { sources };
}

// ─── rshSynthesize helpers ───────────────────────────────────────────────────

function countOccurrences(items: string[][]): Map<string, number> {
    const count = new Map<string, number>();
    for (const group of items) {
        for (const item of group) {
            count.set(item, (count.get(item) ?? 0) + 1);
        }
    }
    return count;
}

function filterShared(countMap: Map<string, number>): string[] {
    return [...countMap.entries()].filter(([, n]) => n > 1).map(([k]) => k);
}

function buildConnections(
    sources: readonly SourceInfo[],
): Array<{ from: string; to: string; via: string }> {
    const connections: Array<{ from: string; to: string; via: string }> = [];
    for (const src of sources) {
        for (const imp of src.imports) {
            const matched = resolveSource(imp, sources, src.path);
            if (matched) {
                connections.push({ from: src.path, to: matched.path, via: imp });
            }
        }
    }
    return connections;
}

// ─── rshSynthesize ───────────────────────────────────────────────────────────

export function rshSynthesize(input: RshSynthesizeInput): SynthesizeOutput {
    const { sources } = input;
    const sharedTypes = filterShared(countOccurrences(sources.map((s) => s.types)));
    const commonDeps = filterShared(countOccurrences(sources.map((s) => s.imports)));
    const apiSurface = [...new Set(sources.flatMap((s) => s.exports))];
    const connections = buildConnections(sources);
    return { sharedTypes, commonDeps, apiSurface, connections };
}

// ─── rshValidate helpers ─────────────────────────────────────────────────────

function findMissingDeps(sources: readonly SourceInfo[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    for (const src of sources) {
        for (const imp of src.imports) {
            if (!imp.startsWith('.')) continue;
            if (!resolveSource(imp, sources, src.path)) {
                issues.push({
                    type: 'missing-dep',
                    message: `Import '${imp}' in '${src.path}' does not resolve to any analyzed source`,
                    files: [src.path],
                });
            }
        }
    }
    return issues;
}

function buildAdjacency(sources: readonly SourceInfo[]): Map<string, Set<string>> {
    const adj = new Map<string, Set<string>>();
    for (const src of sources) {
        const deps = new Set<string>();
        for (const imp of src.imports) {
            const resolved = resolveSource(imp, sources, src.path);
            if (resolved) deps.add(resolved.path);
        }
        adj.set(src.path, deps);
    }
    return adj;
}

function findCircularRefs(adjacency: Map<string, Set<string>>): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const reported = new Set<string>();
    for (const [from, deps] of adjacency) {
        for (const to of deps) {
            const back = adjacency.get(to);
            if (back?.has(from)) {
                const key = [from, to].sort().join('|');
                if (!reported.has(key)) {
                    reported.add(key);
                    issues.push({
                        type: 'circular-ref',
                        message: `Circular reference detected between '${from}' and '${to}'`,
                        files: [from, to],
                    });
                }
            }
        }
    }
    return issues;
}

function findDuplicateExports(sources: readonly SourceInfo[]): ValidationIssue[] {
    const exportMap = new Map<string, string[]>();
    for (const src of sources) {
        for (const exp of src.exports) {
            const existing = exportMap.get(exp) ?? [];
            existing.push(src.path);
            exportMap.set(exp, existing);
        }
    }
    const issues: ValidationIssue[] = [];
    for (const [name, paths] of exportMap) {
        if (paths.length > 1) {
            issues.push({
                type: 'undefined-type',
                message: `Export '${name}' is defined in multiple files: ${paths.join(', ')}`,
                files: paths,
            });
        }
    }
    return issues;
}

// ─── rshValidate ─────────────────────────────────────────────────────────────

export function rshValidate(input: RshValidateInput): RshValidateOutput {
    const { sources } = input;
    const issues = [
        ...findMissingDeps(sources),
        ...findCircularRefs(buildAdjacency(sources)),
        ...findDuplicateExports(sources),
    ];
    return { issues, valid: issues.length === 0 };
}
