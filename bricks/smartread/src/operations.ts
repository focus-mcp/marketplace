// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export interface SrInput {
    readonly path: string;
}

export interface SrSummaryEntry {
    readonly name: string;
    readonly startLine: number;
    readonly endLine: number;
    readonly lineCount: number;
}

export async function srFull(input: SrInput): Promise<{ content: string }> {
    const content = await readFile(resolve(input.path), 'utf-8');
    return { content };
}

export async function srMap(input: SrInput): Promise<{ lines: string[] }> {
    const content = await readFile(resolve(input.path), 'utf-8');
    const mapPattern = /^(export\s+)?(async\s+function|function|class|interface|type|const)\s+/;
    const lines = content.split('\n').filter((line) => mapPattern.test(line.trimStart()));
    return { lines };
}

export async function srSignatures(input: SrInput): Promise<{ lines: string[] }> {
    const content = await readFile(resolve(input.path), 'utf-8');
    const exportPattern = /^export\s+(async\s+function|function|class|interface|type|const)\s+/;
    const lines = content.split('\n').filter((line) => exportPattern.test(line.trimStart()));
    return { lines };
}

export async function srImports(input: SrInput): Promise<{ lines: string[] }> {
    const content = await readFile(resolve(input.path), 'utf-8');
    const lines = content
        .split('\n')
        .filter((line) => /^import\s+/.test(line.trimStart()) || line.includes('require('));
    return { lines };
}

const BLOCK_START = /^(?:export\s+)?(?:async\s+)?(?:function|class)\s+(\w+)/;

function findBlockEnd(allLines: string[], startIdx: number): number {
    let depth = 0;
    let foundOpen = false;
    for (let j = startIdx; j < allLines.length; j++) {
        const l = allLines[j] ?? '';
        for (const ch of l) {
            if (ch === '{') {
                depth++;
                foundOpen = true;
            } else if (ch === '}') {
                depth--;
            }
        }
        if (foundOpen && depth === 0) return j;
    }
    return startIdx;
}

export async function srSummary(input: SrInput): Promise<{ entries: SrSummaryEntry[] }> {
    const content = await readFile(resolve(input.path), 'utf-8');
    const allLines = content.split('\n');
    const entries: SrSummaryEntry[] = [];

    let i = 0;
    while (i < allLines.length) {
        const rawLine = allLines[i] ?? '';
        const match = BLOCK_START.exec(rawLine.trimStart());
        if (!match) {
            i++;
            continue;
        }
        const name = match[1];
        if (name === undefined) {
            i++;
            continue;
        }
        const startLine = i + 1;
        const endIdx = findBlockEnd(allLines, i);
        const endLine = endIdx + 1;
        entries.push({ name, startLine, endLine, lineCount: endLine - startLine + 1 });
        i = endIdx + 1;
    }

    return { entries };
}
