/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(
    output: unknown,
    queriedCapability: string,
    expectedCount: number,
): InvariantResult[] {
    const o = output as { capability?: unknown; agents?: unknown; count?: unknown };
    const results: InvariantResult[] = [
        inv.outputHasField(output, 'capability'),
        inv.outputHasField(output, 'agents'),
        inv.outputHasField(output, 'count'),
        (() => {
            if (o.capability !== queriedCapability) {
                return {
                    ok: false,
                    reason: `expected capability='${queriedCapability}', got ${String(o.capability)}`,
                };
            }
            return { ok: true };
        })(),
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
                    reason: `expected agents length=${expectedCount}, got ${String(Array.isArray(o.agents) ? o.agents.length : typeof o.agents)}`,
                };
            }
            return { ok: true };
        })(),
    ];

    if (Array.isArray(o.agents)) {
        for (let i = 0; i < o.agents.length; i++) {
            const entry = o.agents[i] as { capabilities?: unknown };
            results.push(
                (() => {
                    if (
                        !Array.isArray(entry.capabilities) ||
                        !entry.capabilities.includes(queriedCapability)
                    ) {
                        return {
                            ok: false,
                            reason: `agents[${i}].capabilities must include '${queriedCapability}', got ${JSON.stringify(entry.capabilities)}`,
                        };
                    }
                    return { ok: true };
                })(),
            );
        }
    }

    return results;
}
