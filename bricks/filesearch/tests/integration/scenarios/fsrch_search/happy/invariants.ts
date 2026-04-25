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
            if (matches.length === 0) {
                return { ok: false, reason: 'expected at least one match for @Injectable' };
            }
            return { ok: true };
        })(),
        (() => {
            const matches = (output as { matches: unknown[] }).matches;
            if (!Array.isArray(matches)) return { ok: true }; // already checked above
            const hasInjectable = matches.some(
                (m) => typeof m === 'string' && m.includes('@Injectable'),
            );
            if (!hasInjectable) {
                return {
                    ok: false,
                    reason: 'expected at least one match entry to contain @Injectable',
                };
            }
            return { ok: true };
        })(),
    ];
}
