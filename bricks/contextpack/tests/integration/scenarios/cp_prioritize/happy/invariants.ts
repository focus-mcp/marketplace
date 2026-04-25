/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

function checkRankedEntries(entries: unknown[]): InvariantResult {
    for (const entry of entries) {
        if (
            typeof entry !== 'object' ||
            entry === null ||
            !('path' in entry) ||
            !('score' in entry) ||
            !('reason' in entry)
        ) {
            return {
                ok: false,
                reason: 'each ranked entry must have path, score, and reason fields',
            };
        }
        const e = entry as { score: unknown; reason: unknown };
        if (typeof e.score !== 'number') {
            return { ok: false, reason: 'ranked[].score must be a number' };
        }
        if (typeof e.reason !== 'string') {
            return { ok: false, reason: 'ranked[].reason must be a string' };
        }
    }
    return { ok: true };
}

function checkTopRanked(ranked: unknown[]): InvariantResult {
    const top = ranked[0] as { path: unknown; score: unknown };
    if (typeof top.score !== 'number' || top.score <= 0) {
        return { ok: false, reason: 'top-ranked file must have score > 0' };
    }
    const topPath = String(top.path);
    if (!topPath.includes('testing')) {
        return { ok: false, reason: `expected testing file ranked first, got "${topPath}"` };
    }
    return { ok: true };
}

function checkPrioritizeOutput(output: unknown): InvariantResult {
    const out = output as { ranked: unknown };
    if (!Array.isArray(out.ranked)) {
        return { ok: false, reason: 'output.ranked must be an array' };
    }
    if (out.ranked.length !== 3) {
        return { ok: false, reason: `expected ranked.length=3, got ${out.ranked.length}` };
    }
    const entriesResult = checkRankedEntries(out.ranked as unknown[]);
    if (!entriesResult.ok) return entriesResult;
    return checkTopRanked(out.ranked as unknown[]);
}

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'ranked'),
        checkPrioritizeOutput(output),
        inv.outputSizeUnder(4096)(output),
    ];
}
