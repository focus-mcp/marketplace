/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputSizeUnder(2048)(output),
        inv.outputHasField(output, 'key'),
        inv.outputHasField(output, 'value'),
        inv.outputHasField(output, 'set'),
        (() => {
            const o = output as { set: unknown };
            if (o.set !== false) {
                return {
                    ok: false,
                    reason: `expected set=false for non-existent key, got ${String(o.set)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { value: unknown };
            if (o.value !== undefined) {
                return {
                    ok: false,
                    reason: `expected value=undefined for non-existent key, got ${JSON.stringify(o.value)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
