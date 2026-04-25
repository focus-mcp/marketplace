/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

function checkTopEntry(
    top: unknown,
    expectedTopFile: string,
    expectedCount: number,
): InvariantResult {
    if (typeof top !== 'object' || top === null) {
        return { ok: false, reason: 'files[0] must be an object' };
    }
    if (!('file' in top) || !('count' in top) || !('lastAccess' in top)) {
        return { ok: false, reason: 'files[0] must have file, count, lastAccess fields' };
    }
    const entry = top as { file: unknown; count: unknown; lastAccess: unknown };
    if (entry.file !== expectedTopFile) {
        return {
            ok: false,
            reason: `expected top file="${expectedTopFile}", got "${String(entry.file)}"`,
        };
    }
    if (typeof entry.count !== 'number' || entry.count !== expectedCount) {
        return {
            ok: false,
            reason: `expected count=${expectedCount}, got ${String(entry.count)}`,
        };
    }
    if (typeof entry.lastAccess !== 'number' || entry.lastAccess <= 0) {
        return { ok: false, reason: 'lastAccess must be a positive timestamp' };
    }
    return { ok: true };
}

function checkHotfilesOutput(
    output: unknown,
    expectedTopFile: string,
    expectedCount: number,
): InvariantResult {
    const out = output as { files: unknown };
    if (!Array.isArray(out.files)) {
        return { ok: false, reason: 'output.files must be an array' };
    }
    if (out.files.length === 0) {
        return { ok: false, reason: 'output.files must not be empty after tracking' };
    }
    return checkTopEntry(out.files[0], expectedTopFile, expectedCount);
}

export function check(
    output: unknown,
    expectedTopFile: string,
    expectedCount: number,
): InvariantResult[] {
    return [
        inv.outputHasField(output, 'files'),
        checkHotfilesOutput(output, expectedTopFile, expectedCount),
        inv.outputSizeUnder(4096)(output),
    ];
}
