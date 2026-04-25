/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown, expectedCount: number): InvariantResult[] {
    return [
        inv.outputHasField(output, 'tasks'),
        inv.outputHasField(output, 'count'),
        inv.outputSizeUnder(8192)(output),
        (() => {
            const o = output as { tasks: unknown };
            if (!Array.isArray(o.tasks)) {
                return {
                    ok: false,
                    reason: `expected tasks to be an array, got ${typeof o.tasks}`,
                };
            }
            if (o.tasks.length !== expectedCount) {
                return {
                    ok: false,
                    reason: `expected tasks.length=${expectedCount}, got ${o.tasks.length}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { count: unknown };
            if (o.count !== expectedCount) {
                return {
                    ok: false,
                    reason: `expected count=${expectedCount}, got ${String(o.count)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
