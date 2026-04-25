/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    const o = output as { result?: unknown; logs?: unknown; duration?: unknown; error?: unknown };
    return [
        inv.outputSizeUnder(2048)(output),
        inv.outputHasField(output, 'result'),
        inv.outputHasField(output, 'error'),
        (() => {
            if (typeof o.error !== 'string' || o.error.length === 0) {
                return {
                    ok: false,
                    reason: `expected non-empty error string, got ${String(o.error)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            if (o.result !== 'undefined') {
                return {
                    ok: false,
                    reason: `expected result='undefined' on error, got ${String(o.result)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
