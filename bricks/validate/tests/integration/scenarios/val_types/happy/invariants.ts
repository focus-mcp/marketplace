/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    const o = output as { issues?: unknown[]; score?: unknown };
    return [
        inv.outputSizeUnder(2048)(output),
        inv.outputHasField(output, 'issues'),
        inv.outputHasField(output, 'score'),
        (() => {
            if (!Array.isArray(o.issues) || o.issues.length !== 0) {
                return {
                    ok: false,
                    reason: `expected empty issues array, got ${JSON.stringify(o.issues)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            if (o.score !== 100) {
                return { ok: false, reason: `expected score=100, got ${String(o.score)}` };
            }
            return { ok: true };
        })(),
    ];
}
