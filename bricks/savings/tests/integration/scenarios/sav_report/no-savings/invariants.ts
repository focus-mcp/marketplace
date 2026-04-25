/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'sessionId'),
        inv.outputHasField(output, 'saved'),
        inv.outputHasField(output, 'percentage'),
        inv.outputHasField(output, 'factor'),
        // Tool must not error — output is a proper object
        (() => {
            if (typeof output !== 'object' || output === null) {
                return { ok: false, reason: `expected object output, got ${typeof output}` };
            }
            return { ok: true };
        })(),
        // saved is negative: 1000 - 2000 = -1000
        (() => {
            const o = output as { saved: unknown };
            if (typeof o.saved !== 'number' || o.saved >= 0) {
                return {
                    ok: false,
                    reason: `expected negative saved when actual > baseline, got ${String(o.saved)}`,
                };
            }
            return { ok: true };
        })(),
        // percentage is negative
        (() => {
            const o = output as { percentage: unknown };
            if (typeof o.percentage !== 'number' || o.percentage >= 0) {
                return {
                    ok: false,
                    reason: `expected negative percentage when actual > baseline, got ${String(o.percentage)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
