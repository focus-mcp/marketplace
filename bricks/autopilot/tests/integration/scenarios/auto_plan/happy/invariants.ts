/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    const o = output as { planId?: unknown; task?: unknown; steps?: unknown };
    const results: InvariantResult[] = [
        inv.outputHasField(output, 'planId'),
        inv.outputHasField(output, 'task'),
        inv.outputHasField(output, 'steps'),
        (() => {
            if (typeof o.planId !== 'string' || o.planId.length === 0) {
                return {
                    ok: false,
                    reason: `expected planId to be a non-empty string, got ${String(o.planId)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            if (!Array.isArray(o.steps) || o.steps.length < 1) {
                return {
                    ok: false,
                    reason: `expected steps to be a non-empty array, got ${JSON.stringify(o.steps)}`,
                };
            }
            return { ok: true };
        })(),
    ];

    if (Array.isArray(o.steps)) {
        for (let i = 0; i < o.steps.length; i++) {
            const s = o.steps[i] as { title?: unknown; reasoning?: unknown; status?: unknown };
            results.push(
                (() => {
                    if (typeof s.title !== 'string' || s.title.length === 0) {
                        return {
                            ok: false,
                            reason: `steps[${i}].title expected non-empty string, got ${String(s.title)}`,
                        };
                    }
                    return { ok: true };
                })(),
            );
            results.push(
                (() => {
                    if (typeof s.reasoning !== 'string' || s.reasoning.length === 0) {
                        return {
                            ok: false,
                            reason: `steps[${i}].reasoning expected non-empty string, got ${String(s.reasoning)}`,
                        };
                    }
                    return { ok: true };
                })(),
            );
            results.push(
                (() => {
                    if (s.status !== 'pending') {
                        return {
                            ok: false,
                            reason: `steps[${i}].status expected 'pending', got ${String(s.status)}`,
                        };
                    }
                    return { ok: true };
                })(),
            );
        }
    }

    return results;
}
