// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { open, readdir, writeFile } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';

// ─── Constants ────────────────────────────────────────────────────────────────

const SUPPORTED_EXTS = new Set([
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.mts',
    '.mjs',
    '.json',
    '.md',
    '.yaml',
    '.yml',
    '.css',
    '.html',
]);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TxtMatch {
    file: string;
    line: number;
    column: number;
    text: string;
    contextBefore: string;
    contextAfter: string;
}

export interface TxtSearchInput {
    readonly dir: string;
    readonly pattern: string;
    readonly glob?: string;
    readonly maxResults?: number;
}

export interface TxtSearchOutput {
    matches: TxtMatch[];
    total: number;
    truncated: boolean;
}

export interface TxtRegexInput {
    readonly dir: string;
    readonly pattern: string;
    readonly flags?: string;
    readonly glob?: string;
    readonly maxResults?: number;
}

export interface TxtRegexOutput {
    matches: TxtMatch[];
    total: number;
    truncated: boolean;
}

export interface TxtReplaceChange {
    file: string;
    line: number;
    before: string;
    after: string;
}

export interface TxtReplaceInput {
    readonly dir: string;
    readonly pattern: string;
    readonly replacement: string;
    readonly isRegex?: boolean;
    readonly glob?: string;
    readonly apply?: boolean;
}

export interface TxtReplaceOutput {
    changes: TxtReplaceChange[];
    filesAffected: number;
    totalReplacements: number;
    applied: boolean;
}

export interface TxtGroupedEntry {
    file: string;
    count: number;
    lines: number[];
}

export interface TxtGroupedInput {
    readonly dir: string;
    readonly pattern: string;
    readonly isRegex?: boolean;
    readonly glob?: string;
}

export interface TxtGroupedOutput {
    groups: TxtGroupedEntry[];
    totalFiles: number;
    totalMatches: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Checks if a filename matches a simple glob pattern (e.g. *.ts, *.{ts,tsx}).
 */
function matchesGlob(filename: string, glob: string): boolean {
    // Handle *.{ext1,ext2} patterns
    const braceMatch = /^\*\.\{(.+)\}$/.exec(glob);
    if (braceMatch?.[1]) {
        const exts = braceMatch[1].split(',').map((e) => `.${e.trim()}`);
        return exts.includes(extname(filename));
    }
    // Handle *.ext pattern
    const extMatch = /^\*(\.\w+)$/.exec(glob);
    if (extMatch?.[1]) {
        return extname(filename) === extMatch[1];
    }
    // Handle exact filename match
    return filename === glob;
}

async function collectFiles(
    dir: string,
    glob: string | undefined,
    results: string[],
): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const name = entry.name.toString();
        if (name.startsWith('.') || name === 'node_modules') continue;
        const full = join(dir, name);
        if (entry.isDirectory()) {
            await collectFiles(full, glob, results);
        } else {
            const ext = extname(name);
            if (!SUPPORTED_EXTS.has(ext)) continue;
            if (glob && !matchesGlob(name, glob)) continue;
            results.push(full);
        }
    }
}

async function readLines(filePath: string): Promise<string[] | null> {
    const fh = await open(filePath, 'r').catch(() => null);
    if (!fh) return null;
    try {
        const content = await fh.readFile('utf-8');
        // Detect binary content by checking for null bytes
        if (content.includes('\0')) return null;
        return content.split('\n');
    } catch {
        return null;
    } finally {
        await fh.close();
    }
}

// ─── txtSearch ────────────────────────────────────────────────────────────────

function makeMatch(
    dir: string,
    filePath: string,
    lines: string[],
    i: number,
    col: number,
): TxtMatch {
    return {
        file: relative(dir, filePath),
        line: i + 1,
        column: col + 1,
        text: lines[i] ?? '',
        contextBefore: lines[i - 1] ?? '',
        contextAfter: lines[i + 1] ?? '',
    };
}

async function searchInFile(
    filePath: string,
    dir: string,
    pattern: string,
    matches: TxtMatch[],
    maxResults: number,
): Promise<boolean> {
    const lines = await readLines(filePath);
    if (!lines) return false;
    for (let i = 0; i < lines.length; i++) {
        const col = (lines[i] ?? '').indexOf(pattern);
        if (col === -1) continue;
        matches.push(makeMatch(dir, filePath, lines, i, col));
        if (matches.length >= maxResults) return true;
    }
    return false;
}

export async function txtSearch(input: TxtSearchInput): Promise<TxtSearchOutput> {
    const dir = resolve(input.dir);
    const maxResults = input.maxResults ?? 50;
    const files: string[] = [];
    await collectFiles(dir, input.glob, files);

    const matches: TxtMatch[] = [];
    let truncated = false;

    for (const filePath of files) {
        const done = await searchInFile(filePath, dir, input.pattern, matches, maxResults);
        if (done) {
            truncated = true;
            break;
        }
    }

    return { matches, total: matches.length, truncated };
}

// ─── txtRegex ─────────────────────────────────────────────────────────────────

async function regexInFile(
    filePath: string,
    dir: string,
    regex: RegExp,
    matches: TxtMatch[],
    maxResults: number,
): Promise<boolean> {
    const lines = await readLines(filePath);
    if (!lines) return false;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';
        regex.lastIndex = 0;
        if (!regex.test(line)) continue;
        regex.lastIndex = 0;
        const m = regex.exec(line);
        matches.push(makeMatch(dir, filePath, lines, i, m ? m.index : 0));
        if (matches.length >= maxResults) return true;
    }
    return false;
}

export async function txtRegex(input: TxtRegexInput): Promise<TxtRegexOutput> {
    const dir = resolve(input.dir);
    const maxResults = input.maxResults ?? 50;
    const flags = input.flags ?? 'i';
    const files: string[] = [];
    await collectFiles(dir, input.glob, files);

    let regex: RegExp;
    try {
        regex = new RegExp(input.pattern, flags);
    } catch {
        return { matches: [], total: 0, truncated: false };
    }

    const matches: TxtMatch[] = [];
    let truncated = false;

    for (const filePath of files) {
        const done = await regexInFile(filePath, dir, regex, matches, maxResults);
        if (done) {
            truncated = true;
            break;
        }
    }

    return { matches, total: matches.length, truncated };
}

// ─── txtReplace ───────────────────────────────────────────────────────────────

function buildSearchRegex(pattern: string, isRegex: boolean | undefined): RegExp | null {
    if (isRegex) {
        try {
            return new RegExp(pattern, 'g');
        } catch {
            return null;
        }
    }
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(escaped, 'g');
}

async function replaceInFile(
    filePath: string,
    dir: string,
    searchRegex: RegExp,
    replacement: string,
    apply: boolean | undefined,
    changes: TxtReplaceChange[],
    affectedFiles: Set<string>,
): Promise<void> {
    const lines = await readLines(filePath);
    if (!lines) return;

    const newLines: string[] = [];
    let fileChanged = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';
        searchRegex.lastIndex = 0;
        if (searchRegex.test(line)) {
            searchRegex.lastIndex = 0;
            const newLine = line.replace(searchRegex, replacement);
            newLines.push(newLine);
            changes.push({
                file: relative(dir, filePath),
                line: i + 1,
                before: line,
                after: newLine,
            });
            fileChanged = true;
        } else {
            newLines.push(line);
        }
    }

    if (fileChanged) {
        affectedFiles.add(filePath);
        if (apply) await writeFile(filePath, newLines.join('\n'), 'utf-8');
    }
}

export async function txtReplace(input: TxtReplaceInput): Promise<TxtReplaceOutput> {
    const dir = resolve(input.dir);
    const files: string[] = [];
    await collectFiles(dir, input.glob, files);

    const searchRegex = buildSearchRegex(input.pattern, input.isRegex);
    if (!searchRegex)
        return { changes: [], filesAffected: 0, totalReplacements: 0, applied: false };

    const changes: TxtReplaceChange[] = [];
    const affectedFiles = new Set<string>();

    for (const filePath of files) {
        await replaceInFile(
            filePath,
            dir,
            searchRegex,
            input.replacement,
            input.apply,
            changes,
            affectedFiles,
        );
    }

    return {
        changes,
        filesAffected: affectedFiles.size,
        totalReplacements: changes.length,
        applied: input.apply === true,
    };
}

// ─── txtGrouped ───────────────────────────────────────────────────────────────

export async function txtGrouped(input: TxtGroupedInput): Promise<TxtGroupedOutput> {
    const dir = resolve(input.dir);
    const files: string[] = [];
    await collectFiles(dir, input.glob, files);

    let searchRegex: RegExp;
    if (input.isRegex) {
        try {
            searchRegex = new RegExp(input.pattern, 'gi');
        } catch {
            return { groups: [], totalFiles: 0, totalMatches: 0 };
        }
    } else {
        const escaped = input.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        searchRegex = new RegExp(escaped, 'gi');
    }

    const groups: TxtGroupedEntry[] = [];
    let totalMatches = 0;

    for (const filePath of files) {
        const lines = await readLines(filePath);
        if (!lines) continue;

        const matchedLines: number[] = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i] ?? '';
            searchRegex.lastIndex = 0;
            if (searchRegex.test(line)) {
                matchedLines.push(i + 1);
            }
        }

        if (matchedLines.length > 0) {
            groups.push({
                file: relative(dir, filePath),
                count: matchedLines.length,
                lines: matchedLines,
            });
            totalMatches += matchedLines.length;
        }
    }

    return {
        groups,
        totalFiles: groups.length,
        totalMatches,
    };
}
