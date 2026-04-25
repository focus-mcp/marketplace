/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(
    cancelOutput: unknown,
    queueOutput: unknown,
    expectedId: string,
): InvariantResult[] {
    const c = cancelOutput as { cancelled?: unknown; id?: unknown; previousStatus?: unknown };
    const q = queueOutput as { tasks?: unknown };
    const results: InvariantResult[] = [
        inv.outputHasField(cancelOutput, 'cancelled'),
        inv.outputHasField(cancelOutput, 'id'),
        inv.outputHasField(cancelOutput, 'previousStatus'),
        (() => {
            if (c.cancelled !== true) {
                return { ok: false, reason: `expected cancelled=true, got ${String(c.cancelled)}` };
            }
            return { ok: true };
        })(),
        (() => {
            if (c.id !== expectedId) {
                return { ok: false, reason: `expected id='${expectedId}', got ${String(c.id)}` };
            }
            return { ok: true };
        })(),
        (() => {
            if (c.previousStatus !== 'pending') {
                return {
                    ok: false,
                    reason: `expected previousStatus='pending', got ${String(c.previousStatus)}`,
                };
            }
            return { ok: true };
        })(),
    ];

    if (Array.isArray(q.tasks)) {
        results.push(
            (() => {
                const pending = (q.tasks as Array<{ id?: unknown; status?: unknown }>).filter(
                    (t) => t.id === expectedId && t.status === 'pending',
                );
                if (pending.length !== 0) {
                    return {
                        ok: false,
                        reason: `task ${expectedId} should not be pending after cancel`,
                    };
                }
                return { ok: true };
            })(),
        );
    }

    return results;
}
