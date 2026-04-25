/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown, expectedChainId: string): InvariantResult[] {
    const results: InvariantResult[] = [
        inv.outputHasField(output, 'chainId'),
        inv.outputHasField(output, 'steps'),
        inv.outputHasField(output, 'branches'),
        inv.outputHasField(output, 'timeline'),
        inv.outputHasField(output, 'conclusion'),
    ];

    const o = output as {
        chainId: unknown;
        steps: unknown;
        branches: unknown;
        timeline: unknown;
        conclusion: unknown;
    };

    results.push(
        (() => {
            if (o.chainId !== expectedChainId) {
                return {
                    ok: false,
                    reason: `expected chainId='${expectedChainId}', got ${String(o.chainId)}`,
                };
            }
            return { ok: true };
        })(),
    );

    results.push(
        (() => {
            if (o.steps !== 3) {
                return { ok: false, reason: `expected steps=3, got ${String(o.steps)}` };
            }
            return { ok: true };
        })(),
    );

    results.push(
        (() => {
            if (typeof o.conclusion !== 'string' || o.conclusion.length === 0) {
                return {
                    ok: false,
                    reason: `expected conclusion to be a non-empty string, got ${String(o.conclusion)}`,
                };
            }
            return { ok: true };
        })(),
    );

    results.push(
        (() => {
            if (!Array.isArray(o.timeline) || o.timeline.length !== 3) {
                return {
                    ok: false,
                    reason: `expected timeline to be array of length 3, got ${String(o.timeline)}`,
                };
            }
            return { ok: true };
        })(),
    );

    if (Array.isArray(o.timeline)) {
        for (const [idx, entry] of (o.timeline as unknown[]).entries()) {
            const e = entry as { index: unknown; thought: unknown };
            results.push(
                (() => {
                    if (e.index !== idx) {
                        return {
                            ok: false,
                            reason: `timeline[${idx}].index should be ${idx}, got ${String(e.index)}`,
                        };
                    }
                    return { ok: true };
                })(),
            );
            results.push(
                (() => {
                    if (typeof e.thought !== 'string' || e.thought.length === 0) {
                        return {
                            ok: false,
                            reason: `timeline[${idx}].thought should be non-empty string, got ${String(e.thought)}`,
                        };
                    }
                    return { ok: true };
                })(),
            );
        }
    }

    return results;
}
