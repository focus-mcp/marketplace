/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown, expectedCount: number): InvariantResult[] {
    const o = output as { tasks?: unknown; count?: unknown };
    const results: InvariantResult[] = [
        inv.outputHasField(output, 'tasks'),
        inv.outputHasField(output, 'count'),
        (() => {
            if (o.count !== expectedCount) {
                return {
                    ok: false,
                    reason: `expected count=${expectedCount}, got ${String(o.count)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            if (!Array.isArray(o.tasks) || o.tasks.length !== expectedCount) {
                return {
                    ok: false,
                    reason: `expected tasks length=${expectedCount}, got ${String(Array.isArray(o.tasks) ? o.tasks.length : typeof o.tasks)}`,
                };
            }
            return { ok: true };
        })(),
    ];

    if (Array.isArray(o.tasks)) {
        for (let i = 0; i < o.tasks.length; i++) {
            const t = o.tasks[i] as {
                id?: unknown;
                type?: unknown;
                status?: unknown;
                priority?: unknown;
            };
            results.push(
                (() => {
                    if (typeof t.id !== 'string' || t.id.length === 0) {
                        return {
                            ok: false,
                            reason: `tasks[${i}].id expected non-empty string, got ${String(t.id)}`,
                        };
                    }
                    return { ok: true };
                })(),
            );
            results.push(
                (() => {
                    if (typeof t.type !== 'string') {
                        return {
                            ok: false,
                            reason: `tasks[${i}].type expected string, got ${typeof t.type}`,
                        };
                    }
                    return { ok: true };
                })(),
            );
            results.push(
                (() => {
                    if (typeof t.status !== 'string') {
                        return {
                            ok: false,
                            reason: `tasks[${i}].status expected string, got ${typeof t.status}`,
                        };
                    }
                    return { ok: true };
                })(),
            );
        }
    }

    return results;
}
