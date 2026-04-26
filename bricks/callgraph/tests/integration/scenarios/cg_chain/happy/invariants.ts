/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    const o = output as { chain?: unknown };
    return [
        inv.outputSizeUnder(4096)(output),
        inv.outputHasField(output, 'chain'),
        (() => {
            if (!Array.isArray(o.chain) || o.chain.length === 0) {
                return {
                    ok: false,
                    reason: `expected non-null chain array, got ${JSON.stringify(o.chain)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            if (!Array.isArray(o.chain) || o.chain[0] !== 'a') {
                return {
                    ok: false,
                    reason: `chain must start with 'a', got ${String(o.chain?.[0])}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            if (!Array.isArray(o.chain) || o.chain[o.chain.length - 1] !== 'c') {
                return {
                    ok: false,
                    reason: `chain must end with 'c', got ${String(o.chain?.[o.chain.length - 1])}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
