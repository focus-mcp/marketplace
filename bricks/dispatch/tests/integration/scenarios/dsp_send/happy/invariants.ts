/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    const o = output as { id?: unknown; type?: unknown; status?: unknown; priority?: unknown };
    return [
        inv.outputHasField(output, 'id'),
        inv.outputHasField(output, 'type'),
        inv.outputHasField(output, 'status'),
        inv.outputHasField(output, 'priority'),
        (() => {
            if (typeof o.id !== 'string' || o.id.length === 0) {
                return {
                    ok: false,
                    reason: `expected id to be a non-empty string, got ${String(o.id)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            if (o.type !== 'review') {
                return { ok: false, reason: `expected type='review', got ${String(o.type)}` };
            }
            return { ok: true };
        })(),
        (() => {
            if (o.status !== 'pending') {
                return { ok: false, reason: `expected status='pending', got ${String(o.status)}` };
            }
            return { ok: true };
        })(),
        (() => {
            if (typeof o.priority !== 'number' || o.priority < 1 || o.priority > 10) {
                return {
                    ok: false,
                    reason: `expected priority in [1,10], got ${String(o.priority)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
