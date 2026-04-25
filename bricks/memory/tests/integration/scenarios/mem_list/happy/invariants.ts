/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown, expectedCount: number): InvariantResult[] {
    return [
        inv.outputHasField(output, 'keys'),
        (() => {
            const o = output as { keys: unknown };
            if (!Array.isArray(o.keys)) {
                return {
                    ok: false,
                    reason: `expected keys to be an array, got ${typeof o.keys}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { keys: unknown[] };
            if (!Array.isArray(o.keys)) return { ok: true };
            if (o.keys.length !== expectedCount) {
                return {
                    ok: false,
                    reason: `expected ${expectedCount} keys, got ${o.keys.length}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
