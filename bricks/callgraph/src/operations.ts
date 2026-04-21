// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const SUPPORTED_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx']);

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

const rExportFn = /^export\s+(async\s+)?function\s+(\w+)/;
const rCallPattern = /\b(\w+)\s*\(/g;

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

function addCallsToMap(map: Map<string, Set<string>>, fnName: string, line: string): void {
    for (const call of extractCallsFromLine(line, fnName)) {
        map.get(fnName)?.add(call);
    }
}

function processLine(
    line: string,
    state: { currentFn: string | undefined; fnDepth: number },
    map: Map<string, Set<string>>,
): void {
    const mFn = rExportFn.exec(line);
    if (mFn) {
        state.currentFn = mFn[2] ?? '';
        if (!map.has(state.currentFn)) map.set(state.currentFn, new Set());
        state.fnDepth = (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length;
        addCallsToMap(map, state.currentFn, line);
        if (state.fnDepth <= 0) state.currentFn = undefined;
        return;
    }
    if (state.currentFn) {
        state.fnDepth += (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length;
        addCallsToMap(map, state.currentFn, line);
        if (state.fnDepth <= 0) state.currentFn = undefined;
    }
}

async function buildCallMap(files: string[]): Promise<Map<string, Set<string>>> {
    const map = new Map<string, Set<string>>();
    for (const f of files) {
        const content = await readFile(f, 'utf-8');
        const state = { currentFn: undefined as string | undefined, fnDepth: 0 };
        for (const line of content.split('\n')) processLine(line, state, map);
    }
    return map;
}

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
        const content = await readFile(f, 'utf-8');
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i] ?? '';
            if (rDecl.test(line)) continue;
            rCall.lastIndex = 0;
            if (rCall.test(line)) callers.push({ file: f, line: i + 1, snippet: line.trim() });
        }
    }
    return { callers };
}

export async function cgCallees(input: CgCalleesInput): Promise<{ callees: string[] }> {
    const content = await readFile(resolve(input.file), 'utf-8');
    const lines = content.split('\n').slice(input.startLine - 1, input.endLine);
    const calleeSet = new Set<string>();
    const keywords = new Set([
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
    ]);
    for (const line of lines) {
        for (const call of extractCallsFromLine(line, '')) {
            if (!keywords.has(call)) calleeSet.add(call);
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
