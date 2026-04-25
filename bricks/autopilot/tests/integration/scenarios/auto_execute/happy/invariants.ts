/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown, expectedPlanId: string): InvariantResult[] {
    const o = output as {
        planId?: unknown;
        step?: unknown;
        status?: unknown;
        reasoning?: unknown;
        result?: unknown;
    };
    return [
        inv.outputHasField(output, 'planId'),
        inv.outputHasField(output, 'step'),
        inv.outputHasField(output, 'status'),
        inv.outputHasField(output, 'reasoning'),
        inv.outputHasField(output, 'result'),
        (() => {
            if (o.planId !== expectedPlanId) {
                return {
                    ok: false,
                    reason: `expected planId='${expectedPlanId}', got ${String(o.planId)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            if (o.step !== 0) {
                return {
                    ok: false,
                    reason: `expected step=0 (first pending step), got ${String(o.step)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            if (o.status !== 'done') {
                return { ok: false, reason: `expected status='done', got ${String(o.status)}` };
            }
            return { ok: true };
        })(),
        (() => {
            if (typeof o.result !== 'string' || o.result.length === 0) {
                return {
                    ok: false,
                    reason: `expected result to be a non-empty string, got ${String(o.result)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
