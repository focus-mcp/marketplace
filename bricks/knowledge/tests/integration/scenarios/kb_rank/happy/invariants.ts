/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown, minResults: number): InvariantResult[] {
    return [
        inv.outputHasField(output, 'results'),
        inv.outputHasField(output, 'total'),
        (() => {
            const o = output as { results: unknown };
            if (!Array.isArray(o.results)) {
                return {
                    ok: false,
                    reason: `expected results to be an array, got ${typeof o.results}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { results: unknown[] };
            if (!Array.isArray(o.results)) return { ok: true };
            if (o.results.length < minResults) {
                return {
                    ok: false,
                    reason: `expected at least ${minResults} ranked results, got ${o.results.length}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as {
                results: Array<{ id: unknown; title: unknown; score: unknown; snippet: unknown }>;
            };
            if (!Array.isArray(o.results)) return { ok: true };
            for (const r of o.results) {
                if (typeof r.id !== 'string') {
                    return { ok: false, reason: `rank result entry missing string id` };
                }
                if (typeof r.score !== 'number' || r.score <= 0) {
                    return {
                        ok: false,
                        reason: `rank result entry score must be > 0, got ${String(r.score)}`,
                    };
                }
                if (typeof r.snippet !== 'string') {
                    return { ok: false, reason: `rank result entry missing string snippet` };
                }
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { results: Array<{ score: unknown }> };
            if (!Array.isArray(o.results) || o.results.length < 2) return { ok: true };
            for (let i = 0; i < o.results.length - 1; i++) {
                const a = o.results[i]?.score;
                const b = o.results[i + 1]?.score;
                if (typeof a !== 'number' || typeof b !== 'number') return { ok: true };
                if (a < b) {
                    return {
                        ok: false,
                        reason: `results not sorted by score descending at index ${i}: ${a} < ${b}`,
                    };
                }
            }
            return { ok: true };
        })(),
    ];
}
