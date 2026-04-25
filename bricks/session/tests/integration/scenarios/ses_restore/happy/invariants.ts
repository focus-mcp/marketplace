/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown, expectedData: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'data'),
        inv.outputHasField(output, 'savedAt'),
        (() => {
            const o = output as { data: unknown };
            if (JSON.stringify(o.data) !== JSON.stringify(expectedData)) {
                return {
                    ok: false,
                    reason: `expected data=${JSON.stringify(expectedData)}, got ${JSON.stringify(o.data)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { savedAt: unknown };
            if (typeof o.savedAt !== 'string' || o.savedAt.length === 0) {
                return {
                    ok: false,
                    reason: `expected savedAt to be a non-empty string, got ${String(o.savedAt)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
