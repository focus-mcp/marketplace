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
            if (o.results.length !== 0) {
                return {
                    ok: false,
                    reason: `expected empty results for nonexistent term, got ${o.results.length} entries`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { total: unknown };
            if (o.total !== 0) {
                return { ok: false, reason: `expected total === 0, got ${o.total}` };
            }
            return { ok: true };
        })(),
    ];
}
