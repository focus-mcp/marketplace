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
        (() => {
            const o = output as { sessionId: unknown };
            if (typeof o.sessionId !== 'string' || o.sessionId.length === 0) {
                return { ok: false, reason: 'sessionId must be a non-empty string' };
            }
            return { ok: true };
        })(),
        (() => {
            // 10000 - 2000 = 8000 saved
            const o = output as { saved: unknown };
            if (o.saved !== 8000) {
                return { ok: false, reason: `expected saved=8000, got ${String(o.saved)}` };
            }
            return { ok: true };
        })(),
        (() => {
            // (10000 - 2000) / 10000 * 100 = 80%
            const o = output as { percentage: unknown };
            if (typeof o.percentage !== 'number' || Math.abs(o.percentage - 80) > 0.01) {
                return {
                    ok: false,
                    reason: `expected percentage≈80, got ${String(o.percentage)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            // 10000 / 2000 = 5x
            const o = output as { factor: unknown };
            if (typeof o.factor !== 'number' || Math.abs(o.factor - 5) > 0.01) {
                return { ok: false, reason: `expected factor≈5, got ${String(o.factor)}` };
            }
            return { ok: true };
        })(),
    ];
}
