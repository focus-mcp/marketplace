// SPDX-FileCopyrightText: 2026 FocusMCP contributors
// SPDX-License-Identifier: MIT

import { readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

export interface FdDiffInput {
    readonly a: string;
    readonly b: string;
}

export interface FdPatchInput {
    readonly path: string;
    readonly patch: string;
}

export interface FdDeltaInput {
    readonly before: string;
    readonly after: string;
}

function buildLcsTable(a: string[], b: string[]): number[] {
    const n = b.length;
    const dp = new Array<number>((a.length + 1) * (n + 1)).fill(0);
    const idx = (i: number, j: number) => i * (n + 1) + j;
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            if (a[i - 1] === b[j - 1]) {
                dp[idx(i, j)] = (dp[idx(i - 1, j - 1)] ?? 0) + 1;
            } else {
                dp[idx(i, j)] = Math.max(dp[idx(i - 1, j)] ?? 0, dp[idx(i, j - 1)] ?? 0);
            }
        }
    }
    return dp;
}

function backtrackLcs(dp: number[], a: string[], b: string[]): string[] {
    const n = b.length;
    const idx = (i: number, j: number) => i * (n + 1) + j;
    const result: string[] = [];
    let i = a.length;
    let j = b.length;
    while (i > 0 && j > 0) {
        const ai = a[i - 1];
        const bj = b[j - 1];
        if (ai === bj && ai !== undefined) {
            result.unshift(ai);
            i--;
            j--;
        } else if ((dp[idx(i - 1, j)] ?? 0) >= (dp[idx(i, j - 1)] ?? 0)) {
            i--;
        } else {
            j--;
        }
    }
    return result;
}

function computeLcs(a: string[], b: string[]): string[] {
    const dp = buildLcsTable(a, b);
    return backtrackLcs(dp, a, b);
}

interface HunkState {
    lines: string[];
    aStart: number;
    bStart: number;
    active: boolean;
}

function flushHunk(state: HunkState, hunks: string[]): void {
    if (state.lines.length === 0) return;
    const aCount = state.lines.filter((l) => !l.startsWith('+')).length;
    const bCount = state.lines.filter((l) => !l.startsWith('-')).length;
    hunks.push(`@@ -${state.aStart + 1},${aCount} +${state.bStart + 1},${bCount} @@`);
    hunks.push(...state.lines);
    state.lines = [];
    state.active = false;
}

interface DiffCursor {
    ai: number;
    bi: number;
    ci: number;
}

function processDiffStep(
    cursor: DiffCursor,
    common: string[],
    aLines: string[],
    bLines: string[],
    hunk: HunkState,
    hunks: string[],
): void {
    const nextCommon = common[cursor.ci];
    const aLine = aLines[cursor.ai];
    const bLine = bLines[cursor.bi];

    if (nextCommon !== undefined && aLine === nextCommon && bLine === nextCommon) {
        flushHunk(hunk, hunks);
        cursor.ai++;
        cursor.bi++;
        cursor.ci++;
        return;
    }

    if (!hunk.active) {
        hunk.aStart = cursor.ai;
        hunk.bStart = cursor.bi;
        hunk.active = true;
    }
    if (aLine !== undefined && (nextCommon === undefined || aLine !== nextCommon)) {
        hunk.lines.push(`-${aLine}`);
        cursor.ai++;
    } else if (bLine !== undefined) {
        hunk.lines.push(`+${bLine}`);
        cursor.bi++;
    }
}

function buildUnifiedDiff(
    aLines: string[],
    bLines: string[],
    aPath: string,
    bPath: string,
): string {
    if (aLines.join('\n') === bLines.join('\n')) return '';

    const common = computeLcs(aLines, bLines);
    const hunks: string[] = [];
    const cursor: DiffCursor = { ai: 0, bi: 0, ci: 0 };
    const hunk: HunkState = { lines: [], aStart: 0, bStart: 0, active: false };

    while (cursor.ai < aLines.length || cursor.bi < bLines.length) {
        processDiffStep(cursor, common, aLines, bLines, hunk, hunks);
    }
    flushHunk(hunk, hunks);

    if (hunks.length === 0) return '';
    return [`--- a/${basename(aPath)}`, `+++ b/${basename(bPath)}`, ...hunks].join('\n');
}

export async function fdDiff(input: FdDiffInput): Promise<{ diff: string }> {
    const [aContent, bContent] = await Promise.all([
        readFile(resolve(input.a), 'utf-8'),
        readFile(resolve(input.b), 'utf-8'),
    ]);
    const diff = buildUnifiedDiff(aContent.split('\n'), bContent.split('\n'), input.a, input.b);
    return { diff };
}

function applyPatchLines(lines: string[], patchLines: string[]): string[] {
    let lineIndex = 0;
    const result = [...lines];
    let offset = 0;

    for (const line of patchLines) {
        if (line.startsWith('@@')) {
            const match = /@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
            if (match) {
                lineIndex = parseInt(match[1] ?? '1', 10) - 1 + offset;
            }
        } else if (line.startsWith('-')) {
            result.splice(lineIndex, 1);
            offset--;
        } else if (line.startsWith('+')) {
            result.splice(lineIndex, 0, line.slice(1));
            lineIndex++;
            offset++;
        } else if (line.startsWith(' ')) {
            lineIndex++;
        }
    }
    return result;
}

export async function fdPatch(input: FdPatchInput): Promise<{ content: string }> {
    const filePath = resolve(input.path);
    const fileContent = await readFile(filePath, 'utf-8');
    const result = applyPatchLines(fileContent.split('\n'), input.patch.split('\n'));
    const newContent = result.join('\n');
    await writeFile(filePath, newContent, 'utf-8');
    return { content: newContent };
}

export async function fdDelta(input: FdDeltaInput): Promise<{ delta: string[] }> {
    const beforeLines = input.before.split('\n');
    const afterLines = input.after.split('\n');
    const commonArr = computeLcs(beforeLines, afterLines);

    const delta: string[] = [];
    let ci = 0;
    let ai = 0;
    let bi = 0;

    while (ai < beforeLines.length || bi < afterLines.length) {
        const nextCommon = commonArr[ci];
        const beforeLine = beforeLines[ai];
        const afterLine = afterLines[bi];

        if (nextCommon !== undefined && beforeLine === nextCommon && afterLine === nextCommon) {
            ai++;
            bi++;
            ci++;
        } else if (
            beforeLine !== undefined &&
            (nextCommon === undefined || beforeLine !== nextCommon)
        ) {
            delta.push(`-${beforeLine}`);
            ai++;
        } else if (afterLine !== undefined) {
            delta.push(`+${afterLine}`);
            bi++;
        }
    }

    return { delta };
}
