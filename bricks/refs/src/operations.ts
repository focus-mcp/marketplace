// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { open, readdir } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

// ─── Bus interface ─────────────────────────────────────────────────────────────

export interface RefsBrickBus {
    request<TRequest = unknown, TResponse = unknown>(
        target: string,
        payload: TRequest,
    ): Promise<TResponse>;
}

// ─── Module-level bus injection ───────────────────────────────────────────────

let _bus: RefsBrickBus | undefined;
let _supportedExts: Set<string> | undefined;

export function setBus(bus: RefsBrickBus): void {
    _bus = bus;
}

export function clearBus(): void {
    _bus = undefined;
    _supportedExts = undefined;
}

const FALLBACK_EXTS = new Set([
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
]);

async function getSupportedExts(): Promise<Set<string>> {
    if (_supportedExts) return _supportedExts;
    if (!_bus) return FALLBACK_EXTS;
    try {
        const result = await _bus.request<Record<never, never>, { exts: string[] }>(
            'treesitter:supported-exts',
            {},
        );
        const exts = result?.exts;
        if (Array.isArray(exts) && exts.length > 0) {
            _supportedExts = new Set(exts);
        } else {
            _supportedExts = FALLBACK_EXTS;
        }
    } catch {
        _supportedExts = FALLBACK_EXTS;
    }
    return _supportedExts;
}

// ─── bus response types (MUST match treesitter brick's shapes — bus contract) ─

interface RefEntry {
    name: string;
    line: number;
    col: number;
    kind: string;
}

interface ExtractRefsOutput {
    refs: RefEntry[];
}

interface SymbolInfo {
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
    symbols: SymbolInfo[];
    imports: Array<{ from: string; names: string[] }>;
    exports: string[];
}

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

async function collectFiles(dir: string, results: string[]): Promise<void> {
    const exts = await getSupportedExts();
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const name = entry.name.toString();
        if (name.startsWith('.') || name === 'node_modules' || name === 'vendor') continue;
        const full = join(dir, name);
        if (entry.isDirectory()) {
            await collectFiles(full, results);
        } else if (exts.has(extname(name))) {
            results.push(full);
        }
    }
}

async function readFileContent(filePath: string): Promise<string> {
    const fh = await open(filePath, 'r');
    try {
        return await fh.readFile('utf-8');
    } finally {
        await fh.close();
    }
}

// ─── refsReferences ──────────────────────────────────────────────────────────

const IMPORT_LINE_RE = /^(?:import|use)\s+/;

function refsFromBusResult(fp: string, content: string, refs: RefEntry[]): ReferenceEntry[] {
    const lines = content.split('\n');
    return refs.map((ref) => {
        const snippet = (lines[ref.line - 1] ?? '').trim();
        const kind: 'import' | 'usage' = IMPORT_LINE_RE.test(snippet) ? 'import' : 'usage';
        return { file: fp, line: ref.line, snippet, kind };
    });
}

function refsFromText(fp: string, content: string, name: string): ReferenceEntry[] {
    const importPattern = new RegExp(`\\b${name}\\b`);
    const importLinePattern = /^import\s+/;
    const entries: ReferenceEntry[] = [];
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';
        if (!importPattern.test(line)) continue;
        const kind: 'import' | 'usage' = importLinePattern.test(line) ? 'import' : 'usage';
        entries.push({ file: fp, line: i + 1, snippet: line.trim(), kind });
    }
    return entries;
}

async function refsForFile(fp: string, name: string): Promise<ReferenceEntry[]> {
    let content: string;
    try {
        content = await readFileContent(fp);
    } catch {
        return [];
    }
    if (_bus) {
        try {
            const { refs } = await _bus.request<
                { path: string; content: string; name: string },
                ExtractRefsOutput
            >('treesitter:extract-refs', { path: fp, content, name });
            return refsFromBusResult(fp, content, refs);
        } catch {
            // fallback to text search below
        }
    }
    return refsFromText(fp, content, name);
}

export async function refsReferences(input: RefsInput): Promise<RefsReferencesOutput> {
    const abs = resolve(input.dir);
    const files: string[] = [];
    await collectFiles(abs, files);
    const references: ReferenceEntry[] = [];
    for (const fp of files) {
        references.push(...(await refsForFile(fp, input.name)));
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
        let lines: string[];
        try {
            const content = await readFileContent(fp);
            lines = content.split('\n');
        } catch {
            continue;
        }
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

async function findDeclInFile(fp: string, name: string): Promise<DeclarationEntry | null> {
    let content: string;
    try {
        content = await readFileContent(fp);
    } catch {
        return null;
    }
    if (_bus) {
        try {
            const { symbols } = await _bus.request<
                { path: string; content: string },
                ExtractSymbolsOutput
            >('treesitter:extract-symbols', { path: fp, content });
            const sym = symbols.find((s) => s.name === name);
            if (sym) {
                return { file: fp, line: sym.line, signature: sym.signature, kind: sym.kind };
            }
            return null;
        } catch {
            // fallback to text search
        }
    }
    const declPattern = new RegExp(
        `^export\\s+(?:async\\s+)?(?:function|class|default\\s+class|interface|type|const)\\s+${name}\\b`,
    );
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';
        if (declPattern.test(line)) {
            return { file: fp, line: i + 1, signature: line.trim(), kind: detectDeclKind(line) };
        }
    }
    return null;
}

export async function refsDeclaration(input: RefsInput): Promise<RefsDeclarationOutput> {
    const abs = resolve(input.dir);
    const files: string[] = [];
    await collectFiles(abs, files);
    for (const fp of files) {
        const decl = await findDeclInFile(fp, input.name);
        if (decl) return { declaration: decl };
    }
    return { declaration: null };
}

function detectDeclKind(line: string): string {
    if (/^export\s+(async\s+)?function\b/.test(line)) return 'function';
    if (/^export\s+(default\s+)?class\b/.test(line)) return 'class';
    if (/^export\s+interface\b/.test(line)) return 'interface';
    if (/^export\s+type\b/.test(line)) return 'type';
    if (/^export\s+const\b/.test(line)) return 'variable';
    return 'unknown';
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
        let content: string;
        try {
            content = await readFileContent(fp);
        } catch {
            continue;
        }
        for (const line of content.split('\n')) {
            processHierarchyLine(line, patterns, parents, children);
        }
    }

    return { parents, children };
}
