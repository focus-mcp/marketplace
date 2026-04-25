/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'matches'),
        inv.outputHasField(output, 'total'),
        (() => {
            const out = output as { matches: unknown };
            if (!Array.isArray(out.matches)) {
                return { ok: false, reason: 'output.matches must be an array' };
            }
            if (out.matches.length === 0) {
                return {
                    ok: false,
                    reason: 'expected at least 1 match for "Injectable" in fixtures',
                };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as { total: unknown };
            if (typeof out.total !== 'number' || out.total < 1) {
                return { ok: false, reason: 'output.total must be >= 1' };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(32768)(output),
    ];
}
