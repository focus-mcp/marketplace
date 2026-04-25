/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'error'),
        (() => {
            const o = output as { error: unknown };
            if (typeof o.error !== 'string' || o.error.length === 0) {
                return {
                    ok: false,
                    reason: `expected error to be a non-empty string, got ${String(o.error)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
