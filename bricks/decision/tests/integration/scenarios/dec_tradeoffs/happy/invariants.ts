/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown, expectedDecisionId: string): InvariantResult[] {
    return [
        inv.outputHasField(output, 'decisionId'),
        inv.outputHasField(output, 'criteriaCount'),
        inv.outputHasField(output, 'scored'),
        (() => {
            const o = output as { decisionId: unknown };
            if (o.decisionId !== expectedDecisionId) {
                return {
                    ok: false,
                    reason: `expected decisionId='${expectedDecisionId}', got ${String(o.decisionId)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { criteriaCount: unknown };
            if (o.criteriaCount !== 2) {
                return {
                    ok: false,
                    reason: `expected criteriaCount=2, got ${String(o.criteriaCount)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { scored: unknown };
            if (o.scored !== 3) {
                return {
                    ok: false,
                    reason: `expected scored=3 (3 options scored), got ${String(o.scored)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
