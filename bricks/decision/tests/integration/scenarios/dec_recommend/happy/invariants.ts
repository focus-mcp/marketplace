/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown, expectedDecisionId: string): InvariantResult[] {
    const results: InvariantResult[] = [
        inv.outputHasField(output, 'decisionId'),
        inv.outputHasField(output, 'ranking'),
        inv.outputHasField(output, 'recommended'),
    ];

    const o = output as { decisionId: unknown; ranking: unknown; recommended: unknown };

    results.push(
        (() => {
            if (o.decisionId !== expectedDecisionId) {
                return {
                    ok: false,
                    reason: `expected decisionId='${expectedDecisionId}', got ${String(o.decisionId)}`,
                };
            }
            return { ok: true };
        })(),
    );

    results.push(
        (() => {
            if (!Array.isArray(o.ranking) || o.ranking.length !== 3) {
                return {
                    ok: false,
                    reason: `expected ranking to be array of length 3, got ${String(o.ranking)}`,
                };
            }
            return { ok: true };
        })(),
    );

    if (Array.isArray(o.ranking)) {
        for (const [idx, entry] of (o.ranking as unknown[]).entries()) {
            const e = entry as { option: unknown; weightedScore: unknown };
            results.push(
                (() => {
                    if (typeof e.option !== 'string' || e.option.length === 0) {
                        return {
                            ok: false,
                            reason: `ranking[${idx}].option should be non-empty string, got ${String(e.option)}`,
                        };
                    }
                    return { ok: true };
                })(),
            );
            results.push(
                (() => {
                    if (typeof e.weightedScore !== 'number') {
                        return {
                            ok: false,
                            reason: `ranking[${idx}].weightedScore should be a number, got ${typeof e.weightedScore}`,
                        };
                    }
                    return { ok: true };
                })(),
            );
        }
    }

    results.push(
        (() => {
            if (typeof o.recommended !== 'string' || o.recommended.length === 0) {
                return {
                    ok: false,
                    reason: `expected recommended to be a non-empty string, got ${String(o.recommended)}`,
                };
            }
            return { ok: true };
        })(),
    );

    // MongoDB: 7*0.4 + 9*0.6 = 2.8 + 5.4 = 8.2 (highest)
    // SQLite:  5*0.4 + 10*0.6 = 2.0 + 6.0 = 8.0
    // PostgreSQL: 8*0.4 + 7*0.6 = 3.2 + 4.2 = 7.4
    results.push(
        (() => {
            if (o.recommended !== 'MongoDB') {
                return {
                    ok: false,
                    reason: `expected recommended='MongoDB' (highest weighted score 8.2), got ${String(o.recommended)}`,
                };
            }
            return { ok: true };
        })(),
    );

    return results;
}
