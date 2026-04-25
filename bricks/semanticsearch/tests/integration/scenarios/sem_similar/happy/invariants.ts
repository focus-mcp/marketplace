/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

function isSearchResult(val: unknown): val is { id: string; score: number } {
    return (
        typeof val === 'object' &&
        val !== null &&
        typeof (val as { id?: unknown }).id === 'string' &&
        typeof (val as { score?: unknown }).score === 'number'
    );
}

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'results'),
        (() => {
            const out = output as { results: unknown };
            if (!Array.isArray(out.results)) {
                return { ok: false, reason: 'output.results must be an array' };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as { results: unknown[] };
            if (!Array.isArray(out.results)) return { ok: true };
            for (const r of out.results) {
                if (!isSearchResult(r)) {
                    return {
                        ok: false,
                        reason: 'each result must have id (string) and score (number)',
                    };
                }
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as { results: unknown[] };
            if (!Array.isArray(out.results)) return { ok: true };
            if (out.results.length === 0) {
                return { ok: false, reason: 'expected at least 1 similar result' };
            }
            const hasTarget = out.results.some((r) => (r as { id: string }).id === 'doc-auth');
            if (hasTarget) {
                return {
                    ok: false,
                    reason: 'results must not include the target document (doc-auth)',
                };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(4096)(output),
    ];
}
