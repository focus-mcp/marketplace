/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'data'),
        inv.outputHasField(output, 'savedAt'),
        (() => {
            const o = output as { data: unknown };
            if (o.data !== null) {
                return {
                    ok: false,
                    reason: `expected data=null for non-existent session, got ${JSON.stringify(o.data)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { savedAt: unknown };
            if (o.savedAt !== null) {
                return {
                    ok: false,
                    reason: `expected savedAt=null for non-existent session, got ${String(o.savedAt)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
