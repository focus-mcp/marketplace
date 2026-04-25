/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(
    output: unknown,
    expectedDecisionId: string,
    expectedChosen: string,
): InvariantResult[] {
    return [
        inv.outputHasField(output, 'decisionId'),
        inv.outputHasField(output, 'chosen'),
        inv.outputHasField(output, 'rationale'),
        inv.outputHasField(output, 'saved'),
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
            const o = output as { chosen: unknown };
            if (o.chosen !== expectedChosen) {
                return {
                    ok: false,
                    reason: `expected chosen='${expectedChosen}', got ${String(o.chosen)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { rationale: unknown };
            if (typeof o.rationale !== 'string' || o.rationale.length === 0) {
                return {
                    ok: false,
                    reason: `expected rationale to be a non-empty string, got ${String(o.rationale)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            // No outputPath provided → saved=false
            const o = output as { saved: unknown };
            if (o.saved !== false) {
                return {
                    ok: false,
                    reason: `expected saved=false (no outputPath), got ${String(o.saved)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
