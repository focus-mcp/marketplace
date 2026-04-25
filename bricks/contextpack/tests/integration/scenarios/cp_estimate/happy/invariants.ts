/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

function checkPerFileEntries(entries: unknown[]): InvariantResult {
    for (const entry of entries) {
        if (
            typeof entry !== 'object' ||
            entry === null ||
            !('path' in entry) ||
            !('tokens' in entry)
        ) {
            return { ok: false, reason: 'each perFile entry must have path and tokens fields' };
        }
        const e = entry as { tokens: unknown };
        if (typeof e.tokens !== 'number') {
            return { ok: false, reason: 'perFile[].tokens must be a number' };
        }
    }
    return { ok: true };
}

function checkEstimateOutput(output: unknown): InvariantResult {
    const out = output as { estimatedTokens: unknown; perFile: unknown };
    if (typeof out.estimatedTokens !== 'number' || out.estimatedTokens <= 0) {
        return { ok: false, reason: 'output.estimatedTokens must be > 0' };
    }
    if (!Array.isArray(out.perFile)) {
        return { ok: false, reason: 'output.perFile must be an array' };
    }
    if (out.perFile.length !== 3) {
        return { ok: false, reason: `expected perFile.length=3, got ${out.perFile.length}` };
    }
    return checkPerFileEntries(out.perFile as unknown[]);
}

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'estimatedTokens'),
        inv.outputHasField(output, 'perFile'),
        checkEstimateOutput(output),
        inv.outputSizeUnder(8192)(output),
    ];
}
