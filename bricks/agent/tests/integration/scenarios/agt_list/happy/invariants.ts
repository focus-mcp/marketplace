/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown, expectedCount: number): InvariantResult[] {
    const o = output as { agents?: unknown; count?: unknown };
    const results: InvariantResult[] = [
        inv.outputHasField(output, 'agents'),
        inv.outputHasField(output, 'count'),
        (() => {
            if (o.count !== expectedCount) {
                return {
                    ok: false,
                    reason: `expected count=${expectedCount}, got ${String(o.count)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            if (!Array.isArray(o.agents) || o.agents.length !== expectedCount) {
                return {
                    ok: false,
                    reason: `expected agents array length=${expectedCount}, got ${String(Array.isArray(o.agents) ? o.agents.length : typeof o.agents)}`,
                };
            }
            return { ok: true };
        })(),
    ];

    if (Array.isArray(o.agents)) {
        for (let i = 0; i < o.agents.length; i++) {
            const entry = o.agents[i] as { id?: unknown; name?: unknown; capabilities?: unknown };
            results.push(
                (() => {
                    if (typeof entry.id !== 'string' || entry.id.length === 0) {
                        return {
                            ok: false,
                            reason: `agents[${i}].id expected non-empty string, got ${String(entry.id)}`,
                        };
                    }
                    return { ok: true };
                })(),
            );
            results.push(
                (() => {
                    if (typeof entry.name !== 'string' || entry.name.length === 0) {
                        return {
                            ok: false,
                            reason: `agents[${i}].name expected non-empty string, got ${String(entry.name)}`,
                        };
                    }
                    return { ok: true };
                })(),
            );
            results.push(
                (() => {
                    if (!Array.isArray(entry.capabilities)) {
                        return {
                            ok: false,
                            reason: `agents[${i}].capabilities expected array, got ${typeof entry.capabilities}`,
                        };
                    }
                    return { ok: true };
                })(),
            );
        }
    }

    return results;
}
