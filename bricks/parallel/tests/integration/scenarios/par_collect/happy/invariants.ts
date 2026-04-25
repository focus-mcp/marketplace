/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown, expectedRunId: string): InvariantResult[] {
    const o = output as { runId?: unknown; results?: unknown; summary?: unknown };
    const results: InvariantResult[] = [
        inv.outputSizeUnder(2048)(output),
        inv.outputHasField(output, 'runId'),
        inv.outputHasField(output, 'results'),
        inv.outputHasField(output, 'summary'),
        (() => {
            if (o.runId !== expectedRunId) {
                return {
                    ok: false,
                    reason: `expected runId='${expectedRunId}', got ${String(o.runId)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            if (!Array.isArray(o.results) || o.results.length !== 2) {
                return {
                    ok: false,
                    reason: `expected results length=2, got ${String(Array.isArray(o.results) ? o.results.length : typeof o.results)}`,
                };
            }
            return { ok: true };
        })(),
    ];

    if (Array.isArray(o.results)) {
        for (let i = 0; i < o.results.length; i++) {
            const r = o.results[i] as {
                id?: unknown;
                exitCode?: unknown;
                stdout?: unknown;
                timedOut?: unknown;
            };
            results.push(
                (() => {
                    if (typeof r.id !== 'string' || r.id.length === 0) {
                        return {
                            ok: false,
                            reason: `results[${i}].id expected non-empty string, got ${String(r.id)}`,
                        };
                    }
                    return { ok: true };
                })(),
            );
            results.push(
                (() => {
                    if (typeof r.exitCode !== 'number') {
                        return {
                            ok: false,
                            reason: `results[${i}].exitCode expected number, got ${typeof r.exitCode}`,
                        };
                    }
                    return { ok: true };
                })(),
            );
            results.push(
                (() => {
                    if (typeof r.timedOut !== 'boolean') {
                        return {
                            ok: false,
                            reason: `results[${i}].timedOut expected boolean, got ${typeof r.timedOut}`,
                        };
                    }
                    return { ok: true };
                })(),
            );
        }
    }

    const s =
        (o.summary as {
            total?: unknown;
            completed?: unknown;
            failed?: unknown;
            timedOut?: unknown;
        }) ?? {};
    results.push(inv.outputHasField(o.summary, 'total'));
    results.push(
        (() => {
            if (s.total !== 2) {
                return { ok: false, reason: `expected summary.total=2, got ${String(s.total)}` };
            }
            return { ok: true };
        })(),
    );

    return results;
}
