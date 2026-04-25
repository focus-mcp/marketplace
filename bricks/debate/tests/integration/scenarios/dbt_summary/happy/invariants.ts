/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown, expectedDebateId: string): InvariantResult[] {
    const results: InvariantResult[] = [
        inv.outputHasField(output, 'debateId'),
        inv.outputHasField(output, 'topic'),
        inv.outputHasField(output, 'keyPoints'),
        inv.outputHasField(output, 'positionCount'),
        inv.outputHasField(output, 'scored'),
    ];

    const o = output as {
        debateId: unknown;
        topic: unknown;
        winner: unknown;
        keyPoints: unknown;
        agreementAreas: unknown;
        disagreementAreas: unknown;
        positionCount: unknown;
        scored: unknown;
    };

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
            if (o.topic !== 'Should we adopt microservices?') {
                return {
                    ok: false,
                    reason: `expected topic='Should we adopt microservices?', got ${String(o.topic)}`,
                };
            }
            return { ok: true };
        })(),
    );

    results.push(
        (() => {
            if (!Array.isArray(o.keyPoints) || o.keyPoints.length === 0) {
                return {
                    ok: false,
                    reason: `expected keyPoints to be a non-empty array, got ${String(o.keyPoints)}`,
                };
            }
            return { ok: true };
        })(),
    );

    if (Array.isArray(o.keyPoints)) {
        for (const [idx, kp] of (o.keyPoints as unknown[]).entries()) {
            results.push(
                (() => {
                    if (typeof kp !== 'string' || kp.length === 0) {
                        return {
                            ok: false,
                            reason: `keyPoints[${idx}] should be non-empty string, got ${String(kp)}`,
                        };
                    }
                    return { ok: true };
                })(),
            );
        }
    }

    results.push(
        (() => {
            if (o.positionCount !== 2) {
                return {
                    ok: false,
                    reason: `expected positionCount=2, got ${String(o.positionCount)}`,
                };
            }
            return { ok: true };
        })(),
    );

    // scored=true because we called dbt_score before summary
    results.push(
        (() => {
            if (o.scored !== true) {
                return { ok: false, reason: `expected scored=true, got ${String(o.scored)}` };
            }
            return { ok: true };
        })(),
    );

    return results;
}
