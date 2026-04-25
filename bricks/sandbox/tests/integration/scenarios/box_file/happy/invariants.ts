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
        inv.outputHasField(output, 'logs'),
        inv.outputHasField(output, 'duration'),
        (() => {
            if (o.error !== undefined) {
                return { ok: false, reason: `expected no error, got ${String(o.error)}` };
            }
            return { ok: true };
        })(),
        (() => {
            if (o.result !== '42') {
                return { ok: false, reason: `expected result='42', got ${String(o.result)}` };
            }
            return { ok: true };
        })(),
        (() => {
            if (typeof o.duration !== 'number' || o.duration < 0) {
                return {
                    ok: false,
                    reason: `expected duration >= 0, got ${String(o.duration)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
