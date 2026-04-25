/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    const o = output as { results?: unknown; stoppedAt?: unknown };
    const results: InvariantResult[] = [
        inv.outputHasField(output, 'results'),
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
            if (o.stoppedAt !== undefined) {
                return {
                    ok: false,
                    reason: `expected no stoppedAt (all commands succeed), got ${String(o.stoppedAt)}`,
                };
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
                            reason: `results[${i}].stdout expected non-empty string, got ${String(r.stdout)}`,
                        };
                    }
                    return { ok: true };
                })(),
            );
        }
    }

    return results;
}
