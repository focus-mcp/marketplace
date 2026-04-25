/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'entries'),
        inv.outputHasField(output, 'hits'),
        inv.outputHasField(output, 'misses'),
        inv.outputHasField(output, 'hitRate'),
        inv.outputHasField(output, 'totalBytes'),
        (() => {
            const o = output as { entries: unknown };
            if (o.entries !== 0) {
                return {
                    ok: false,
                    reason: `expected entries=0 on fresh store, got ${String(o.entries)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { hits: unknown };
            if (o.hits !== 0) {
                return { ok: false, reason: `expected hits=0 initially, got ${String(o.hits)}` };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { misses: unknown };
            if (o.misses !== 0) {
                return {
                    ok: false,
                    reason: `expected misses=0 initially, got ${String(o.misses)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { hitRate: unknown };
            if (o.hitRate !== 0) {
                return {
                    ok: false,
                    reason: `expected hitRate=0 initially, got ${String(o.hitRate)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
