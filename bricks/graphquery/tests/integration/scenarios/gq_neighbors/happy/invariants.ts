/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    const o = output as { neighbors?: Array<{ id?: unknown }> };
    return [
        inv.outputSizeUnder(2048)(output),
        inv.outputHasField(output, 'neighbors'),
        (() => {
            if (!Array.isArray(o.neighbors) || o.neighbors.length < 2) {
                return {
                    ok: false,
                    reason: `expected >= 2 neighbors, got ${String(o.neighbors?.length)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const ids = o.neighbors?.map((n) => n.id) ?? [];
            if (!ids.includes('a') || !ids.includes('c')) {
                return {
                    ok: false,
                    reason: `expected neighbors to include 'a' and 'c', got ${JSON.stringify(ids)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
