/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'results'),
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
            if (o.results.length !== 2) {
                return {
                    ok: false,
                    reason: `expected 2 results for query 'proj', got ${o.results.length}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { results: Array<{ key: unknown }> };
            if (!Array.isArray(o.results)) return { ok: true };
            const keys = o.results.map((r) => r.key);
            if (!keys.includes('proj:alpha') || !keys.includes('proj:beta')) {
                return {
                    ok: false,
                    reason: `expected keys proj:alpha and proj:beta in results, got ${JSON.stringify(keys)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
