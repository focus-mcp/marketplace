// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { readdir, readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

// ─── Bus interface ────────────────────────────────────────────────────────────

export interface CallgraphBrickBus {
    request<TRequest = unknown, TResponse = unknown>(
        target: string,
        payload: TRequest,
    ): Promise<TResponse>;
}

// ─── Module-level bus injection ───────────────────────────────────────────────

let _bus: CallgraphBrickBus | undefined;
let _supportedExts: Set<string> | undefined;

export function setBus(bus: CallgraphBrickBus): void {
    _bus = bus;
}

export function clearBus(): void {
    _bus = undefined;
    _supportedExts = undefined;
}

function getBus(): CallgraphBrickBus {
    if (!_bus) throw new Error('callgraph: bus not initialized — brick must be started first');
    return _bus;
}

async function getSupportedExts(): Promise<Set<string>> {
    if (_supportedExts) return _supportedExts;
    const bus = _bus;
    if (!bus) return new Set(['.ts', '.tsx', '.js', '.jsx']);
    try {
        const { exts } = await bus.request<Record<never, never>, { exts: string[] }>(
            'treesitter:supported-exts',
            {},
        );
        _supportedExts = new Set(exts);
    } catch {
        _supportedExts = new Set([
            '.ts',
            '.tsx',
            '.js',
            '.jsx',
            '.php',
            '.py',
            '.go',
            '.rs',
            '.java',
        ]);
    }
    return _supportedExts;
}

// ─── bus response types (MUST match treesitter brick's shapes — bus contract) ─

interface CallEntry {
    caller: string;
    callee: string;
    line: number;
}

interface ExtractCallsOutput {
    calls: CallEntry[];
}

// ─── File collection ──────────────────────────────────────────────────────────

async function collectFiles(dir: string): Promise<string[]> {
    const exts = await getSupportedExts();
    const entries = await readdir(dir, { withFileTypes: true });
    const results: string[] = [];
    for (const e of entries) {
        if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'vendor') continue;
        const full = join(dir, e.name);
        if (e.isDirectory()) {
            results.push(...(await collectFiles(full)));
        } else {
            if (exts.has(extname(e.name))) results.push(full);
        }
    }
    return results;
}

// ─── Call map from treesitter:extract-calls ──────────────────────────────────

async function buildCallMap(files: string[]): Promise<Map<string, Set<string>>> {
    const bus = getBus();
    const map = new Map<string, Set<string>>();
    for (const f of files) {
        try {
            const content = await readFile(f, 'utf-8');
            const result = await bus.request<{ path: string; content: string }, ExtractCallsOutput>(
                'treesitter:extract-calls',
                { path: f, content },
            );
            for (const { caller, callee } of result.calls) {
                if (!map.has(caller)) map.set(caller, new Set());
                map.get(caller)?.add(callee);
            }
        } catch {
            // per-file error isolation
        }
    }
    return map;
}

// ─── Local regex fallback for cgCallees (reads explicit line range) ───────────

const CALL_KEYWORDS = new Set([
    'if',
    'for',
    'while',
    'switch',
    'catch',
    'function',
    'class',
    'return',
    'new',
    'typeof',
    'instanceof',
    'constructor',
]);

const rCallPattern = /\b(\w+)\s*\(/g;

function extractCallsFromLine(line: string, selfName: string): string[] {
    const calls: string[] = [];
    const re = new RegExp(rCallPattern.source, 'g');
    let m = re.exec(line);
    while (m !== null) {
        const name = m[1] ?? '';
        if (!CALL_KEYWORDS.has(name) && name !== selfName) calls.push(name);
        m = re.exec(line);
    }
    return calls;
}

// ─── Input types ──────────────────────────────────────────────────────────────

export interface CgCallersInput {
    readonly name: string;
    readonly dir: string;
}

export interface CgCalleesInput {
    readonly name: string;
    readonly file: string;
    readonly startLine: number;
    readonly endLine: number;
}

export interface CgChainInput {
    readonly from: string;
    readonly to: string;
    readonly dir: string;
    readonly maxDepth?: number;
}

export interface CgDepthInput {
    readonly name: string;
    readonly dir: string;
    readonly maxDepth?: number;
}

export interface CallerInfo {
    file: string;
    line: number;
    snippet: string;
}

// ─── Implementations ──────────────────────────────────────────────────────────

function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function cgCallers(input: CgCallersInput): Promise<{ callers: CallerInfo[] }> {
    const abs = resolve(input.dir);
    const files = await collectFiles(abs);
    const callers: CallerInfo[] = [];
    const rCall = new RegExp(`\\b${escapeRegex(input.name)}\\s*\\(`, 'g');
    const rDecl = new RegExp(
        `^\\s*(export\\s+)?(async\\s+)?function\\s+${escapeRegex(input.name)}\\b`,
    );
    for (const f of files) {
        try {
            const content = await readFile(f, 'utf-8');
            const lines = content.split('\n');
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i] ?? '';
                if (rDecl.test(line)) continue;
                rCall.lastIndex = 0;
                if (rCall.test(line)) callers.push({ file: f, line: i + 1, snippet: line.trim() });
            }
        } catch {
            // per-file error isolation
        }
    }
    return { callers };
}

export async function cgCallees(input: CgCalleesInput): Promise<{ callees: string[] }> {
    const content = await readFile(resolve(input.file), 'utf-8');
    const lines = content.split('\n').slice(input.startLine - 1, input.endLine);
    const calleeSet = new Set<string>();
    for (const line of lines) {
        for (const call of extractCallsFromLine(line, input.name)) {
            if (!CALL_KEYWORDS.has(call)) calleeSet.add(call);
        }
    }
    return { callees: Array.from(calleeSet) };
}

export async function cgChain(input: CgChainInput): Promise<{ chain: string[] | null }> {
    const maxDepth = input.maxDepth ?? 5;
    const callMap = await buildCallMap(await collectFiles(resolve(input.dir)));
    const queue: Array<string[]> = [[input.from]];
    const visited = new Set<string>();
    while (queue.length > 0) {
        const path = queue.shift();
        if (!path) continue;
        const last = path[path.length - 1] ?? '';
        if (last === input.to) return { chain: path };
        if (path.length > maxDepth || visited.has(last)) continue;
        visited.add(last);
        for (const callee of callMap.get(last) ?? new Set<string>()) {
            queue.push([...path, callee]);
        }
    }
    return { chain: null };
}

function dfsDepth(
    callMap: Map<string, Set<string>>,
    name: string,
    visited: Set<string>,
    depth: number,
    maxDepth: number,
): number {
    if (depth >= maxDepth || visited.has(name)) return depth;
    const callees = callMap.get(name) ?? new Set<string>();
    if (callees.size === 0) return depth;
    const next = new Set(visited);
    next.add(name);
    let max = depth;
    for (const callee of callees) {
        const d = dfsDepth(callMap, callee, next, depth + 1, maxDepth);
        if (d > max) max = d;
    }
    return max;
}

export async function cgDepth(input: CgDepthInput): Promise<{ depth: number }> {
    const maxDepth = input.maxDepth ?? 5;
    const callMap = await buildCallMap(await collectFiles(resolve(input.dir)));
    return { depth: dfsDepth(callMap, input.name, new Set(), 0, maxDepth) };
}
