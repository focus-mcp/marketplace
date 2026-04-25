/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    const o = output as { results?: unknown; duration?: unknown };
    const results: InvariantResult[] = [
        inv.outputHasField(output, 'results'),
        inv.outputHasField(output, 'duration'),
        (() => {
            if (!Array.isArray(o.results) || o.results.length !== 2) {
                return {
                    ok: false,
                    reason: `expected results length=2, got ${String(Array.isArray(o.results) ? o.results.length : typeof o.results)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            if (typeof o.duration !== 'number' || o.duration < 0) {
                return { ok: false, reason: `expected duration >= 0, got ${String(o.duration)}` };
            }
            return { ok: true };
        })(),
    ];

    if (Array.isArray(o.results)) {
        for (let i = 0; i < o.results.length; i++) {
            const r = o.results[i] as { exitCode?: unknown; stdout?: unknown };
            results.push(
                (() => {
                    if (r.exitCode !== 0) {
                        return {
                            ok: false,
                            reason: `results[${i}].exitCode expected 0, got ${String(r.exitCode)}`,
                        };
                    }
                    return { ok: true };
                })(),
            );
            results.push(
                (() => {
                    if (typeof r.stdout !== 'string' || r.stdout.trim().length === 0) {
                        return {
                            ok: false,
                            reason: `results[${i}].stdout expected non-empty, got ${String(r.stdout)}`,
                        };
                    }
                    return { ok: true };
                })(),
            );
        }
    }

    return results;
}
