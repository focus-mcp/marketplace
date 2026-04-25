/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown, originalLength: number): InvariantResult[] {
    return [
        inv.outputHasField(output, 'terse'),
        inv.outputHasField(output, 'ratio'),
        (() => {
            const o = output as { terse: unknown };
            if (typeof o.terse !== 'string' || o.terse.length === 0) {
                return { ok: false, reason: 'expected non-empty terse string' };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { terse: string };
            // Should contain at least some of the known identifiers
            const knownIdents = ['UserService', 'MAX_USERS', 'createUser', 'UserId'];
            const found = knownIdents.filter((id) => o.terse.includes(id));
            if (found.length === 0) {
                return {
                    ok: false,
                    reason: `expected at least one known identifier in terse output, got: ${o.terse}`,
                };
            }
            return { ok: true };
        })(),
        inv.outputLengthLessThan('terse', originalLength)(output),
        (() => {
            const o = output as { ratio: unknown };
            if (typeof o.ratio !== 'number' || o.ratio <= 0) {
                return { ok: false, reason: `ratio must be a positive number, got ${o.ratio}` };
            }
            return { ok: true };
        })(),
    ];
}
