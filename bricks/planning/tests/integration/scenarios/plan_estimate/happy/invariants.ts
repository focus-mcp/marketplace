/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown, expectedPlanId: string): InvariantResult[] {
    const results: InvariantResult[] = [
        inv.outputHasField(output, 'planId'),
        inv.outputHasField(output, 'total'),
        inv.outputHasField(output, 'completed'),
        inv.outputHasField(output, 'remaining'),
        inv.outputHasField(output, 'blocked'),
        inv.outputHasField(output, 'estimatedMinutes'),
        inv.outputHasField(output, 'nextAvailable'),
    ];

    const o = output as {
        planId: unknown;
        total: unknown;
        completed: unknown;
        remaining: unknown;
        blocked: unknown;
        estimatedMinutes: unknown;
        nextAvailable: unknown;
    };

    results.push(
        (() => {
            if (o.planId !== expectedPlanId) {
                return {
                    ok: false,
                    reason: `expected planId='${expectedPlanId}', got ${String(o.planId)}`,
                };
            }
            return { ok: true };
        })(),
    );

    results.push(
        (() => {
            if (typeof o.estimatedMinutes !== 'number' || o.estimatedMinutes < 0) {
                return {
                    ok: false,
                    reason: `expected estimatedMinutes to be a non-negative number, got ${String(o.estimatedMinutes)}`,
                };
            }
            return { ok: true };
        })(),
    );

    results.push(
        (() => {
            // Steps with estimates: 30m + 1h = 90 minutes
            if (o.estimatedMinutes !== 90) {
                return {
                    ok: false,
                    reason: `expected estimatedMinutes=90 (30m + 1h), got ${String(o.estimatedMinutes)}`,
                };
            }
            return { ok: true };
        })(),
    );

    results.push(
        (() => {
            if (o.total !== 2) {
                return { ok: false, reason: `expected total=2, got ${String(o.total)}` };
            }
            return { ok: true };
        })(),
    );

    results.push(
        (() => {
            if (o.nextAvailable === undefined) {
                return {
                    ok: false,
                    reason: 'expected nextAvailable to be defined (null or object)',
                };
            }
            return { ok: true };
        })(),
    );

    return results;
}
