/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown, expectedDebateId: string): InvariantResult[] {
    const results: InvariantResult[] = [
        inv.outputHasField(output, 'debateId'),
        inv.outputHasField(output, 'ranking'),
    ];

    const o = output as { debateId: unknown; ranking: unknown };

    results.push(
        (() => {
            if (o.debateId !== expectedDebateId) {
                return {
                    ok: false,
                    reason: `expected debateId='${expectedDebateId}', got ${String(o.debateId)}`,
                };
            }
            return { ok: true };
        })(),
    );

    results.push(
        (() => {
            if (!Array.isArray(o.ranking) || o.ranking.length !== 2) {
                return {
                    ok: false,
                    reason: `expected ranking to be array of length 2, got ${String(o.ranking)}`,
                };
            }
            return { ok: true };
        })(),
    );

    if (Array.isArray(o.ranking)) {
        for (const [idx, entry] of (o.ranking as unknown[]).entries()) {
            const e = entry as { role: unknown; weightedScore: unknown; rank: unknown };
            results.push(
                (() => {
                    if (typeof e.role !== 'string' || e.role.length === 0) {
                        return {
                            ok: false,
                            reason: `ranking[${idx}].role should be non-empty string, got ${String(e.role)}`,
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
            results.push(
                (() => {
                    if (e.rank !== idx + 1) {
                        return {
                            ok: false,
                            reason: `ranking[${idx}].rank should be ${idx + 1}, got ${String(e.rank)}`,
                        };
                    }
                    return { ok: true };
                })(),
            );
        }
    }

    return results;
}
