/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

const VALID_STATUSES = new Set(['pending', 'running', 'done', 'cancelled']);

export function check(
    output: unknown,
    expectedId: string,
    expectedType: string,
): InvariantResult[] {
    const o = output as { id?: unknown; type?: unknown; status?: unknown; payload?: unknown };
    return [
        inv.outputHasField(output, 'id'),
        inv.outputHasField(output, 'type'),
        inv.outputHasField(output, 'status'),
        inv.outputHasField(output, 'payload'),
        (() => {
            if (o.id !== expectedId) {
                return { ok: false, reason: `expected id='${expectedId}', got ${String(o.id)}` };
            }
            return { ok: true };
        })(),
        (() => {
            if (o.type !== expectedType) {
                return {
                    ok: false,
                    reason: `expected type='${expectedType}', got ${String(o.type)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            if (typeof o.status !== 'string' || !VALID_STATUSES.has(o.status)) {
                return {
                    ok: false,
                    reason: `expected status to be one of ${[...VALID_STATUSES].join('|')}, got ${String(o.status)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
