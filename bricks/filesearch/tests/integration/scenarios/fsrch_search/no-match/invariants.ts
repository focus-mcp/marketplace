/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'matches'),
        (() => {
            const matches = (output as { matches: unknown }).matches;
            if (!Array.isArray(matches)) {
                return { ok: false, reason: 'output.matches must be an array' };
            }
            if (matches.length !== 0) {
                return {
                    ok: false,
                    reason: `expected empty matches for nonexistent pattern, got ${matches.length} entries`,
                };
            }
            return { ok: true };
        })(),
    ];
}
