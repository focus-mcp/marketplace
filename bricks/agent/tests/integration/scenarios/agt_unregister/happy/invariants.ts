/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(
    unregisterOutput: unknown,
    listOutput: unknown,
    expectedId: string,
): InvariantResult[] {
    const u = unregisterOutput as { removed?: unknown; id?: unknown };
    const l = listOutput as { agents?: unknown; count?: unknown };
    return [
        inv.outputHasField(unregisterOutput, 'removed'),
        inv.outputHasField(unregisterOutput, 'id'),
        (() => {
            if (u.removed !== true) {
                return { ok: false, reason: `expected removed=true, got ${String(u.removed)}` };
            }
            return { ok: true };
        })(),
        (() => {
            if (u.id !== expectedId) {
                return { ok: false, reason: `expected id='${expectedId}', got ${String(u.id)}` };
            }
            return { ok: true };
        })(),
        inv.outputHasField(listOutput, 'count'),
        (() => {
            if (l.count !== 0) {
                return {
                    ok: false,
                    reason: `expected list count=0 after unregister, got ${String(l.count)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            if (!Array.isArray(l.agents) || l.agents.length !== 0) {
                return {
                    ok: false,
                    reason: `expected agents=[] after unregister, got ${JSON.stringify(l.agents)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
