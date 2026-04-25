/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'results'),
        inv.outputHasField(output, 'total'),
        (() => {
            const o = output as { results: unknown };
            if (!Array.isArray(o.results)) {
                return { ok: false, reason: 'output.results must be an array' };
            }
            if (o.results.length === 0) {
                return { ok: false, reason: 'expected at least one result for "Injectable"' };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { total: unknown };
            if (typeof o.total !== 'number' || o.total <= 0) {
                return { ok: false, reason: `expected total > 0, got ${o.total}` };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as {
                results: Array<{ file: string; score: number; matches: string[] }>;
            };
            if (!Array.isArray(o.results)) return { ok: true };
            const first = o.results[0];
            if (!first) return { ok: true };
            if (typeof first.file !== 'string') {
                return { ok: false, reason: 'result item must have a string "file" field' };
            }
            if (typeof first.score !== 'number') {
                return { ok: false, reason: 'result item must have a number "score" field' };
            }
            if (!Array.isArray(first.matches)) {
                return { ok: false, reason: 'result item must have an array "matches" field' };
            }
            return { ok: true };
        })(),
    ];
}
