/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown, expectedDebateId: string): InvariantResult[] {
    const results: InvariantResult[] = [
        inv.outputHasField(output, 'debateId'),
        inv.outputHasField(output, 'commonTerms'),
        inv.outputHasField(output, 'agreementAreas'),
    ];

    const o = output as { debateId: unknown; commonTerms: unknown; agreementAreas: unknown };

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
            if (!Array.isArray(o.commonTerms)) {
                return {
                    ok: false,
                    reason: `expected commonTerms to be an array, got ${typeof o.commonTerms}`,
                };
            }
            return { ok: true };
        })(),
    );

    results.push(
        (() => {
            if (!Array.isArray(o.agreementAreas) || o.agreementAreas.length === 0) {
                return {
                    ok: false,
                    reason: `expected agreementAreas to be a non-empty array, got ${String(o.agreementAreas)}`,
                };
            }
            return { ok: true };
        })(),
    );

    if (Array.isArray(o.agreementAreas)) {
        for (const [idx, area] of (o.agreementAreas as unknown[]).entries()) {
            results.push(
                (() => {
                    if (typeof area !== 'string' || area.length === 0) {
                        return {
                            ok: false,
                            reason: `agreementAreas[${idx}] should be non-empty string, got ${String(area)}`,
                        };
                    }
                    return { ok: true };
                })(),
            );
        }
    }

    return results;
}
