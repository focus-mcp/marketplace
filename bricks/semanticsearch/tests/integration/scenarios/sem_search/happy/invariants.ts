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
            if (out.results.length === 0) {
                return { ok: false, reason: 'expected at least 1 result' };
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
            if (!Array.isArray(out.results) || out.results.length < 2) return { ok: true };
            const scores = out.results.map((r) => (r as { score: number }).score);
            for (let i = 1; i < scores.length; i++) {
                const prev = scores[i - 1];
                const curr = scores[i];
                if (prev !== undefined && curr !== undefined && prev < curr) {
                    return { ok: false, reason: 'results must be sorted by score descending' };
                }
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as { results: unknown[] };
            if (!Array.isArray(out.results) || out.results.length === 0) return { ok: true };
            const first = out.results[0] as { id: string };
            if (first.id !== 'doc-auth') {
                return {
                    ok: false,
                    reason: `expected doc-auth as top result for "authentication login" query, got "${first.id}"`,
                };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(4096)(output),
    ];
}
