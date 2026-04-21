// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

// ─── Types ───────────────────────────────────────────────────────────────────

export type CompressLevel = 'light' | 'medium' | 'aggressive';

export interface OutputInput {
    readonly text: string;
    readonly level?: CompressLevel;
}

export interface OutputResult {
    compressed: string;
    originalLength: number;
    compressedLength: number;
    ratio: number;
}

export interface ResponseInput {
    readonly json: string;
}

export interface ResponseResult {
    compressed: string;
    ratio: number;
}

export interface TerseInput {
    readonly text: string;
}

export interface TerseResult {
    terse: string;
    ratio: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeRatio(original: number, compressed: number): number {
    if (original === 0) return 1;
    return Math.round((compressed / original) * 100) / 100;
}

function stripBlockComments(text: string): string {
    return text.replace(/\/\*[\s\S]*?\*\//g, '');
}

function stripLineComments(text: string): string {
    return text
        .split('\n')
        .map((line) => {
            const idx = line.indexOf('//');
            if (idx === -1) return line;
            // naive: skip if inside a string (good enough for 80% cases)
            const before = line.slice(0, idx);
            const singles = (before.match(/'/g) ?? []).length;
            const doubles = (before.match(/"/g) ?? []).length;
            const backticks = (before.match(/`/g) ?? []).length;
            if (singles % 2 !== 0 || doubles % 2 !== 0 || backticks % 2 !== 0) return line;
            return line.slice(0, idx).trimEnd();
        })
        .join('\n');
}

function collapseWhitespace(text: string): string {
    return text.replace(/[ \t]{2,}/g, ' ');
}

function removeBlankLines(text: string): string {
    return text
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .join('\n');
}

function abbreviatePatterns(text: string): string {
    return text
        .replace(/\bconsole\.log\(/g, 'log(')
        .replace(/\bconsole\.error\(/g, 'err(')
        .replace(/\bconsole\.warn\(/g, 'warn(')
        .replace(/\bPromise\.resolve\(/g, 'Res(')
        .replace(/\bPromise\.reject\(/g, 'Rej(')
        .replace(/\basync function\b/g, 'async fn')
        .replace(/\bfunction\b/g, 'fn');
}

// ─── cmpOutput ───────────────────────────────────────────────────────────────

export function cmpOutput(input: OutputInput): OutputResult {
    const level = input.level ?? 'medium';
    const originalLength = input.text.length;
    let result = input.text;

    if (level === 'light') {
        result = stripBlockComments(result);
        result = removeBlankLines(result);
    } else if (level === 'medium') {
        result = stripBlockComments(result);
        result = stripLineComments(result);
        result = removeBlankLines(result);
        result = collapseWhitespace(result);
    } else {
        result = stripBlockComments(result);
        result = stripLineComments(result);
        result = removeBlankLines(result);
        result = collapseWhitespace(result);
        result = abbreviatePatterns(result);
    }

    const compressedLength = result.length;
    return {
        compressed: result,
        originalLength,
        compressedLength,
        ratio: computeRatio(originalLength, compressedLength),
    };
}

// ─── cmpResponse ─────────────────────────────────────────────────────────────

function stripNullish(obj: unknown): unknown {
    if (Array.isArray(obj)) return obj.map(stripNullish);
    if (obj !== null && typeof obj === 'object') {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(obj)) {
            if (v === null || v === undefined) continue;
            out[k] = stripNullish(v);
        }
        return out;
    }
    return obj;
}

function collectPathStrings(obj: unknown, paths: string[]): void {
    if (typeof obj === 'string' && (obj.startsWith('/') || obj.includes('\\'))) {
        paths.push(obj);
        return;
    }
    if (Array.isArray(obj)) {
        for (const item of obj) collectPathStrings(item, paths);
        return;
    }
    if (obj !== null && typeof obj === 'object') {
        for (const v of Object.values(obj)) collectPathStrings(v, paths);
    }
}

function findCommonPrefix(paths: string[]): string {
    if (paths.length === 0) return '';
    const sorted = [...paths].sort();
    const first = sorted[0] ?? '';
    const last = sorted[sorted.length - 1] ?? '';
    let i = 0;
    while (i < first.length && first[i] === last[i]) i++;
    const prefix = first.slice(0, i);
    const lastSep = Math.max(prefix.lastIndexOf('/'), prefix.lastIndexOf('\\'));
    return lastSep > 0 ? prefix.slice(0, lastSep + 1) : '';
}

function replacePaths(obj: unknown, prefix: string): unknown {
    if (typeof obj === 'string') {
        return obj.startsWith(prefix) ? obj.slice(prefix.length) : obj;
    }
    if (Array.isArray(obj)) return obj.map((item) => replacePaths(item, prefix));
    if (obj !== null && typeof obj === 'object') {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(obj)) {
            out[k] = replacePaths(v, prefix);
        }
        return out;
    }
    return obj;
}

export function cmpResponse(input: ResponseInput): ResponseResult {
    const originalLength = input.json.length;
    let parsed: unknown;
    try {
        parsed = JSON.parse(input.json);
    } catch {
        return { compressed: input.json, ratio: 1 };
    }
    const stripped = stripNullish(parsed);
    const paths: string[] = [];
    collectPathStrings(stripped, paths);
    const prefix = findCommonPrefix(paths);
    const shortened = prefix ? replacePaths(stripped, prefix) : stripped;
    const compressed = JSON.stringify(shortened);
    return {
        compressed,
        ratio: computeRatio(originalLength, compressed.length),
    };
}

// ─── cmpTerse ─────────────────────────────────────────────────────────────────

const IDENT_RE =
    /\b(?:export\s+)?(?:async\s+)?(?:function|class|interface|type|const|let|var)\s+(\w+)/g;

export function cmpTerse(input: TerseInput): TerseResult {
    const originalLength = input.text.length;
    const seen = new Set<string>();
    const names: string[] = [];
    const re = new RegExp(IDENT_RE.source, 'g');
    for (const match of input.text.matchAll(re)) {
        const name = match[1];
        if (name && !seen.has(name)) {
            seen.add(name);
            names.push(name);
        }
    }
    const terse = names.join(', ');
    return { terse, ratio: computeRatio(originalLength, terse.length) };
}
