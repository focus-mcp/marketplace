// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { open, readdir, writeFile } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CeReplaceBodyInput {
    readonly path: string;
    readonly name: string;
    readonly newBody: string;
    readonly apply?: boolean;
}

export interface CeReplaceBodyOutput {
    found: boolean;
    startLine: number;
    endLine: number;
    preview: {
        before: string;
        after: string;
    };
}

export interface CeInsertAfterInput {
    readonly path: string;
    readonly after?: number;
    readonly pattern?: string;
    readonly content: string;
    readonly apply?: boolean;
}

export interface CeInsertOutput {
    inserted: boolean;
    atLine: number;
    preview: string;
}

export interface CeInsertBeforeInput {
    readonly path: string;
    readonly before?: number;
    readonly pattern?: string;
    readonly content: string;
    readonly apply?: boolean;
}

export interface CeDeleteSafeInput {
    readonly path: string;
    readonly name: string;
    readonly dir?: string;
    readonly force?: boolean;
    readonly apply?: boolean;
}

export interface CeDeleteSafeOutput {
    deleted: boolean;
    blocked: boolean;
    linesRemoved: number;
    dependents: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function readFileText(filePath: string): Promise<string | null> {
    const fh = await open(filePath, 'r').catch(() => null);
    if (!fh) return null;
    try {
        return await fh.readFile('utf-8');
    } finally {
        await fh.close();
    }
}

function makeFunctionPatterns(name: string): RegExp[] {
    return [
        new RegExp(`^\\s*(?:export\\s+)?(?:async\\s+)?function\\s+${name}\\s*[(<]`),
        new RegExp(`^\\s*(?:export\\s+)?const\\s+${name}\\s*=\\s*(?:async\\s*)?(?:\\(|[a-zA-Z_$])`),
    ];
}

function findDeclarationLine(lines: string[], patterns: RegExp[]): number {
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';
        if (patterns.some((p) => p.test(line))) return i;
    }
    return -1;
}

function findOpeningBrace(lines: string[], from: number): number {
    for (let i = from; i < lines.length; i++) {
        if ((lines[i] ?? '').includes('{')) return i;
    }
    return -1;
}

function findClosingBrace(lines: string[], from: number): number {
    let depth = 0;
    for (let i = from; i < lines.length; i++) {
        for (const ch of lines[i] ?? '') {
            if (ch === '{') depth++;
            else if (ch === '}') {
                depth--;
                if (depth === 0) return i;
            }
        }
    }
    return -1;
}

/**
 * Find the start and end line (1-based, inclusive) of a function or arrow-function
 * declaration by name, using brace matching.
 */
export function findFunctionBounds(
    lines: string[],
    name: string,
): { startLine: number; endLine: number; bodyStart: number; bodyEnd: number } | null {
    const patterns = makeFunctionPatterns(name);
    const declLine = findDeclarationLine(lines, patterns);
    if (declLine === -1) return null;

    const braceStart = findOpeningBrace(lines, declLine);
    if (braceStart === -1) return null;

    const braceEnd = findClosingBrace(lines, braceStart);
    if (braceEnd === -1) return null;

    return {
        startLine: declLine + 1, // 1-based
        endLine: braceEnd + 1, // 1-based
        bodyStart: braceStart + 1, // 1-based, line containing '{'
        bodyEnd: braceEnd + 1, // 1-based, line containing '}'
    };
}

const SUPPORTED_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs']);

async function collectSourceFiles(dir: string, results: string[]): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const name = entry.name.toString();
        if (name.startsWith('.') || name === 'node_modules') continue;
        const full = join(dir, name);
        if (entry.isDirectory()) {
            await collectSourceFiles(full, results);
        } else if (SUPPORTED_EXTS.has(extname(name))) {
            results.push(full);
        }
    }
}

async function findDependents(name: string, dir: string, excludePath: string): Promise<string[]> {
    const files: string[] = [];
    await collectSourceFiles(resolve(dir), files);

    const dependents: string[] = [];
    // Match import or usage of the name (import { name }, import name, name(, name.)
    const importPattern = new RegExp(
        `(?:import\\s+(?:\\{[^}]*\\b${name}\\b[^}]*\\}|${name})\\s+from|\\b${name}\\b)`,
    );

    for (const fp of files) {
        if (resolve(fp) === resolve(excludePath)) continue;
        const text = await readFileText(fp);
        if (text && importPattern.test(text)) {
            dependents.push(relative(resolve(dir), fp));
        }
    }

    return dependents;
}

// ─── ceReplaceBody ───────────────────────────────────────────────────────────

export async function ceReplaceBody(input: CeReplaceBodyInput): Promise<CeReplaceBodyOutput> {
    const filePath = resolve(input.path);
    const text = await readFileText(filePath);
    if (!text) {
        return { found: false, startLine: 0, endLine: 0, preview: { before: '', after: '' } };
    }

    const lines = text.split('\n');
    const bounds = findFunctionBounds(lines, input.name);

    if (!bounds) {
        return { found: false, startLine: 0, endLine: 0, preview: { before: '', after: '' } };
    }

    const { startLine, endLine, bodyStart, bodyEnd } = bounds;
    const beforeLines = lines.slice(0, bodyStart - 1);
    const afterLines = lines.slice(bodyEnd);

    // Find indentation from the opening brace line
    const openBraceLine = lines[bodyStart - 1] ?? '';
    const braceIndent = openBraceLine.match(/^(\s*)/)?.[1] ?? '';

    const newLines = [
        ...beforeLines,
        `${braceIndent}{`,
        input.newBody,
        `${braceIndent}}`,
        ...afterLines,
    ];

    const newText = newLines.join('\n');

    if (input.apply) {
        await writeFile(filePath, newText, 'utf-8');
    }

    const previewBefore = lines.slice(startLine - 1, endLine).join('\n');
    const newEndLine = bodyStart + 2; // { + newBody as single line + }
    const previewAfter = newLines.slice(startLine - 1, newEndLine).join('\n');

    return {
        found: true,
        startLine,
        endLine,
        preview: { before: previewBefore, after: previewAfter },
    };
}

// ─── ceInsertAfter ───────────────────────────────────────────────────────────

export async function ceInsertAfter(input: CeInsertAfterInput): Promise<CeInsertOutput> {
    const filePath = resolve(input.path);
    const text = await readFileText(filePath);
    if (!text) {
        return { inserted: false, atLine: 0, preview: '' };
    }

    const lines = text.split('\n');
    let insertAfterIndex = -1; // 0-based index

    if (typeof input.after === 'number') {
        insertAfterIndex = Math.min(input.after, lines.length) - 1;
    } else if (input.pattern) {
        const re = new RegExp(input.pattern);
        for (let i = 0; i < lines.length; i++) {
            if (re.test(lines[i] ?? '')) {
                insertAfterIndex = i;
                break;
            }
        }
    }

    if (insertAfterIndex === -1) {
        return { inserted: false, atLine: 0, preview: '' };
    }

    const insertLine = insertAfterIndex + 1; // 1-based line number where content lands
    const newLines = [
        ...lines.slice(0, insertAfterIndex + 1),
        input.content,
        ...lines.slice(insertAfterIndex + 1),
    ];

    const newText = newLines.join('\n');

    if (input.apply) {
        await writeFile(filePath, newText, 'utf-8');
    }

    const previewStart = Math.max(0, insertAfterIndex - 1);
    const previewEnd = Math.min(newLines.length, insertAfterIndex + 3);
    const preview = newLines.slice(previewStart, previewEnd).join('\n');

    return { inserted: true, atLine: insertLine + 1, preview };
}

// ─── ceInsertBefore ──────────────────────────────────────────────────────────

export async function ceInsertBefore(input: CeInsertBeforeInput): Promise<CeInsertOutput> {
    const filePath = resolve(input.path);
    const text = await readFileText(filePath);
    if (!text) {
        return { inserted: false, atLine: 0, preview: '' };
    }

    const lines = text.split('\n');
    let insertBeforeIndex = -1; // 0-based index

    if (typeof input.before === 'number') {
        insertBeforeIndex = Math.min(input.before - 1, lines.length - 1);
    } else if (input.pattern) {
        const re = new RegExp(input.pattern);
        for (let i = 0; i < lines.length; i++) {
            if (re.test(lines[i] ?? '')) {
                insertBeforeIndex = i;
                break;
            }
        }
    }

    if (insertBeforeIndex === -1) {
        return { inserted: false, atLine: 0, preview: '' };
    }

    const newLines = [
        ...lines.slice(0, insertBeforeIndex),
        input.content,
        ...lines.slice(insertBeforeIndex),
    ];

    const newText = newLines.join('\n');

    if (input.apply) {
        await writeFile(filePath, newText, 'utf-8');
    }

    const previewStart = Math.max(0, insertBeforeIndex - 1);
    const previewEnd = Math.min(newLines.length, insertBeforeIndex + 3);
    const preview = newLines.slice(previewStart, previewEnd).join('\n');

    return { inserted: true, atLine: insertBeforeIndex + 1, preview };
}

// ─── ceDeleteSafe ────────────────────────────────────────────────────────────

export async function ceDeleteSafe(input: CeDeleteSafeInput): Promise<CeDeleteSafeOutput> {
    const filePath = resolve(input.path);
    const text = await readFileText(filePath);
    if (!text) {
        return { deleted: false, blocked: false, linesRemoved: 0, dependents: [] };
    }

    // Check for dependents first if dir is provided
    let dependents: string[] = [];
    if (input.dir) {
        dependents = await findDependents(input.name, input.dir, filePath);
    }

    if (dependents.length > 0 && !input.force) {
        return { deleted: false, blocked: true, linesRemoved: 0, dependents };
    }

    const lines = text.split('\n');
    const bounds = findFunctionBounds(lines, input.name);

    if (!bounds) {
        return { deleted: false, blocked: false, linesRemoved: 0, dependents };
    }

    const { startLine, endLine } = bounds;
    const linesRemoved = endLine - startLine + 1;

    const newLines = [...lines.slice(0, startLine - 1), ...lines.slice(endLine)];
    const newText = newLines.join('\n');

    if (input.apply) {
        await writeFile(filePath, newText, 'utf-8');
    }

    return { deleted: true, blocked: false, linesRemoved, dependents };
}
