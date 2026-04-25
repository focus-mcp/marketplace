/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

function checkFileEntries(files: unknown[]): InvariantResult {
    for (const entry of files) {
        if (
            typeof entry !== 'object' ||
            entry === null ||
            !('path' in entry) ||
            !('tokens' in entry) ||
            !('lines' in entry)
        ) {
            return {
                ok: false,
                reason: 'each files entry must have path, tokens, and lines fields',
            };
        }
        const e = entry as { tokens: unknown; lines: unknown };
        if (typeof e.tokens !== 'number' || typeof e.lines !== 'number') {
            return { ok: false, reason: 'files[].tokens and files[].lines must be numbers' };
        }
    }
    return { ok: true };
}

function checkAnalyzeOutput(output: unknown): InvariantResult {
    const out = output as { totalTokens: unknown; files: unknown; top10: unknown };
    if (typeof out.totalTokens !== 'number' || out.totalTokens <= 0) {
        return { ok: false, reason: 'output.totalTokens must be > 0' };
    }
    if (!Array.isArray(out.files)) {
        return { ok: false, reason: 'output.files must be an array' };
    }
    if (out.files.length === 0) {
        return { ok: false, reason: 'output.files must not be empty' };
    }
    if (!Array.isArray(out.top10)) {
        return { ok: false, reason: 'output.top10 must be an array' };
    }
    return checkFileEntries(out.files as unknown[]);
}

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'totalTokens'),
        inv.outputHasField(output, 'files'),
        inv.outputHasField(output, 'top10'),
        checkAnalyzeOutput(output),
        inv.outputSizeUnder(32768)(output),
    ];
}
