/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

function checkCoAccessedEntry(top: unknown, expectedFiles: string[]): InvariantResult {
    if (typeof top !== 'object' || top === null) {
        return { ok: false, reason: 'coAccessed[0] must be an object' };
    }
    if (!('files' in top) || !('count' in top)) {
        return { ok: false, reason: 'coAccessed[0] must have files and count fields' };
    }
    const entry = top as { files: unknown; count: unknown };
    if (!Array.isArray(entry.files) || entry.files.length !== 2) {
        return { ok: false, reason: 'coAccessed[0].files must be an array of length 2' };
    }
    for (const f of expectedFiles) {
        if (!entry.files.includes(f)) {
            return { ok: false, reason: `expected "${f}" in coAccessed[0].files` };
        }
    }
    if (typeof entry.count !== 'number' || entry.count < 1) {
        return { ok: false, reason: 'coAccessed[0].count must be >= 1' };
    }
    return { ok: true };
}

function checkPatternsOutput(output: unknown, expectedFiles: string[]): InvariantResult {
    const out = output as { coAccessed: unknown };
    if (!Array.isArray(out.coAccessed)) {
        return { ok: false, reason: 'output.coAccessed must be an array' };
    }
    if (out.coAccessed.length === 0) {
        return {
            ok: false,
            reason: 'expected at least 1 co-access pattern after tracking 2 files',
        };
    }
    return checkCoAccessedEntry(out.coAccessed[0], expectedFiles);
}

export function check(output: unknown, expectedFiles: string[]): InvariantResult[] {
    return [
        inv.outputHasField(output, 'coAccessed'),
        checkPatternsOutput(output, expectedFiles),
        inv.outputSizeUnder(4096)(output),
    ];
}
