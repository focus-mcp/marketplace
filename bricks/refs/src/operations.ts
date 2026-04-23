// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { open, readdir } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RefsInput {
    readonly name: string;
    readonly dir: string;
}

export interface ReferenceEntry {
    file: string;
    line: number;
    snippet: string;
    kind: 'import' | 'usage';
}

export interface RefsReferencesOutput {
    references: ReferenceEntry[];
}

export interface ImplementationEntry {
    file: string;
    line: number;
    snippet: string;
}

export interface RefsImplementationsOutput {
    implementations: ImplementationEntry[];
}

export interface DeclarationEntry {
    file: string;
    line: number;
    signature: string;
    kind: string;
}

export interface RefsDeclarationOutput {
    declaration: DeclarationEntry | null;
}

export interface RefsHierarchyOutput {
    parents: string[];
    children: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SUPPORTED_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs']);

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

async function readFileLines(filePath: string): Promise<string[]> {
    const fh = await open(filePath, 'r');
    try {
        const content = await fh.readFile('utf-8');
        return content.split('\n');
    } finally {
        await fh.close();
    }
}

// ─── refsReferences ──────────────────────────────────────────────────────────

export async function refsReferences(input: RefsInput): Promise<RefsReferencesOutput> {
    const abs = resolve(input.dir);
    const files: string[] = [];
    await collectFiles(abs, files);

    const references: ReferenceEntry[] = [];
    const importPattern = new RegExp(`\\b${input.name}\\b`);
    const importLinePattern = /^import\s+/;

    for (const fp of files) {
        const lines = await readFileLines(fp);
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i] ?? '';
            if (!importPattern.test(line)) continue;
            const kind: 'import' | 'usage' = importLinePattern.test(line) ? 'import' : 'usage';
            references.push({ file: fp, line: i + 1, snippet: line.trim(), kind });
        }
    }

    return { references };
}

// ─── refsImplementations ─────────────────────────────────────────────────────

export async function refsImplementations(input: RefsInput): Promise<RefsImplementationsOutput> {
    const abs = resolve(input.dir);
    const files: string[] = [];
    await collectFiles(abs, files);

    const implementations: ImplementationEntry[] = [];
    const implPattern = new RegExp(`(?:implements|extends)\\s+[\\w,\\s]*${input.name}\\b`);

    for (const fp of files) {
        const lines = await readFileLines(fp);
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i] ?? '';
            if (implPattern.test(line)) {
                implementations.push({ file: fp, line: i + 1, snippet: line.trim() });
            }
        }
    }

    return { implementations };
}

// ─── refsDeclaration ─────────────────────────────────────────────────────────

function detectDeclKind(line: string): string {
    if (/^export\s+(async\s+)?function\b/.test(line)) return 'function';
    if (/^export\s+(default\s+)?class\b/.test(line)) return 'class';
    if (/^export\s+interface\b/.test(line)) return 'interface';
    if (/^export\s+type\b/.test(line)) return 'type';
    if (/^export\s+const\b/.test(line)) return 'variable';
    return 'unknown';
}

export async function refsDeclaration(input: RefsInput): Promise<RefsDeclarationOutput> {
    const abs = resolve(input.dir);
    const files: string[] = [];
    await collectFiles(abs, files);

    const declPattern = new RegExp(
        `^export\\s+(?:async\\s+)?(?:function|class|default\\s+class|interface|type|const)\\s+${input.name}\\b`,
    );

    for (const fp of files) {
        const lines = await readFileLines(fp);
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i] ?? '';
            if (declPattern.test(line)) {
                return {
                    declaration: {
                        file: fp,
                        line: i + 1,
                        signature: line.trim(),
                        kind: detectDeclKind(line),
                    },
                };
            }
        }
    }

    return { declaration: null };
}

// ─── refsHierarchy helpers ───────────────────────────────────────────────────

interface HierarchyPatterns {
    parentPattern: RegExp;
    childPattern: RegExp;
    ifaceParentPattern: RegExp;
    ifaceChildPattern: RegExp;
}

function buildHierarchyPatterns(name: string): HierarchyPatterns {
    return {
        parentPattern: new RegExp(`class\\s+${name}\\s+extends\\s+(\\w+)`),
        childPattern: new RegExp(`class\\s+(\\w+)\\s+extends\\s+${name}\\b`),
        ifaceParentPattern: new RegExp(`interface\\s+${name}\\s+extends\\s+([\\w,\\s]+)`),
        ifaceChildPattern: new RegExp(`interface\\s+(\\w+)\\s+extends\\s+[\\w,\\s]*${name}\\b`),
    };
}

function processHierarchyLine(
    line: string,
    patterns: HierarchyPatterns,
    parents: string[],
    children: string[],
): void {
    const mParent = patterns.parentPattern.exec(line);
    if (mParent?.[1] && !parents.includes(mParent[1])) parents.push(mParent[1]);

    const mChild = patterns.childPattern.exec(line);
    if (mChild?.[1] && !children.includes(mChild[1])) children.push(mChild[1]);

    const mIfaceParent = patterns.ifaceParentPattern.exec(line);
    if (mIfaceParent?.[1]) {
        for (const p of mIfaceParent[1].split(',').map((s) => s.trim())) {
            if (p && !parents.includes(p)) parents.push(p);
        }
    }

    const mIfaceChild = patterns.ifaceChildPattern.exec(line);
    if (mIfaceChild?.[1] && !children.includes(mIfaceChild[1])) children.push(mIfaceChild[1]);
}

// ─── refsHierarchy ───────────────────────────────────────────────────────────

export async function refsHierarchy(input: RefsInput): Promise<RefsHierarchyOutput> {
    const abs = resolve(input.dir);
    const files: string[] = [];
    await collectFiles(abs, files);

    const parents: string[] = [];
    const children: string[] = [];
    const patterns = buildHierarchyPatterns(input.name);

    for (const fp of files) {
        const lines = await readFileLines(fp);
        for (const line of lines) {
            processHierarchyLine(line, patterns, parents, children);
        }
    }

    return { parents, children };
}
