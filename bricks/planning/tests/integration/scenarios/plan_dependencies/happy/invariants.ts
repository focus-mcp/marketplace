/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown, expectedPlanId: string): InvariantResult[] {
    const results: InvariantResult[] = [
        inv.outputHasField(output, 'planId'),
        inv.outputHasField(output, 'dependency'),
        inv.outputHasField(output, 'blockedSteps'),
    ];

    const o = output as {
        planId: unknown;
        dependency: unknown;
        blockedSteps: unknown;
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
            const dep = o.dependency as { from: unknown; to: unknown } | null;
            if (!dep || dep.from !== 0 || dep.to !== 1) {
                return {
                    ok: false,
                    reason: `expected dependency={from:0,to:1}, got ${JSON.stringify(dep)}`,
                };
            }
            return { ok: true };
        })(),
    );

    results.push(
        (() => {
            if (!Array.isArray(o.blockedSteps)) {
                return {
                    ok: false,
                    reason: `expected blockedSteps to be an array, got ${typeof o.blockedSteps}`,
                };
            }
            return { ok: true };
        })(),
    );

    results.push(
        (() => {
            if (Array.isArray(o.blockedSteps) && !o.blockedSteps.includes(1)) {
                return {
                    ok: false,
                    reason: `expected blockedSteps to include 1, got ${JSON.stringify(o.blockedSteps)}`,
                };
            }
            return { ok: true };
        })(),
    );

    return results;
}
