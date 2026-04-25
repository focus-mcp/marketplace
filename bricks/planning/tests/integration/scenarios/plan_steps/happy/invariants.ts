/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown, expectedPlanId: string): InvariantResult[] {
    const results: InvariantResult[] = [
        inv.outputHasField(output, 'planId'),
        inv.outputHasField(output, 'steps'),
        inv.outputHasField(output, 'total'),
        inv.outputHasField(output, 'completed'),
    ];

    const o = output as { planId: unknown; steps: unknown; total: unknown; completed: unknown };

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
            if (o.total !== 2) {
                return { ok: false, reason: `expected total=2, got ${String(o.total)}` };
            }
            return { ok: true };
        })(),
    );

    results.push(
        (() => {
            if (o.completed !== 0) {
                return { ok: false, reason: `expected completed=0, got ${String(o.completed)}` };
            }
            return { ok: true };
        })(),
    );

    results.push(
        (() => {
            if (!Array.isArray(o.steps) || o.steps.length !== 2) {
                return {
                    ok: false,
                    reason: `expected steps to be array of length 2, got ${String(o.steps)}`,
                };
            }
            return { ok: true };
        })(),
    );

    if (Array.isArray(o.steps)) {
        for (const [idx, step] of (o.steps as unknown[]).entries()) {
            const s = step as { title: unknown; status: unknown };
            results.push(
                (() => {
                    if (typeof s.title !== 'string' || s.title.length === 0) {
                        return {
                            ok: false,
                            reason: `steps[${idx}].title should be non-empty string, got ${String(s.title)}`,
                        };
                    }
                    return { ok: true };
                })(),
            );
            results.push(
                (() => {
                    if (s.status !== 'pending' && s.status !== 'done' && s.status !== 'blocked') {
                        return {
                            ok: false,
                            reason: `steps[${idx}].status should be pending|done|blocked, got ${String(s.status)}`,
                        };
                    }
                    return { ok: true };
                })(),
            );
        }
    }

    return results;
}
