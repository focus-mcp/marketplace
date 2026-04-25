/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(
    output: unknown,
    expectedCalls: number,
    expectedAvg: number,
): InvariantResult[] {
    return [
        inv.outputHasField(output, 'avg'),
        inv.outputHasField(output, 'min'),
        inv.outputHasField(output, 'max'),
        inv.outputHasField(output, 'calls'),
        inv.outputSizeUnder(2048)(output),
        (() => {
            const o = output as { calls: unknown };
            if (o.calls !== expectedCalls) {
                return {
                    ok: false,
                    reason: `expected calls=${expectedCalls}, got ${String(o.calls)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { avg: unknown };
            if (typeof o.avg !== 'number') {
                return { ok: false, reason: `expected avg to be a number, got ${typeof o.avg}` };
            }
            const diff = Math.abs(o.avg - expectedAvg);
            if (diff > 0.01) {
                return {
                    ok: false,
                    reason: `expected avg≈${expectedAvg}, got ${String(o.avg)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { min: unknown; max: unknown };
            if (typeof o.min !== 'number' || typeof o.max !== 'number') {
                return { ok: false, reason: 'expected min and max to be numbers' };
            }
            if ((o.min as number) > (o.max as number)) {
                return {
                    ok: false,
                    reason: `expected min<=max, got min=${String(o.min)}, max=${String(o.max)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
