/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(
    output: unknown,
    expectedNodeCount: number,
    expectedEdgeCount: number,
): InvariantResult[] {
    const o = output as { loaded?: unknown; nodeCount?: unknown; edgeCount?: unknown };
    return [
        inv.outputHasField(output, 'loaded'),
        inv.outputHasField(output, 'nodeCount'),
        inv.outputHasField(output, 'edgeCount'),
        (() => {
            if (o.loaded !== true) {
                return { ok: false, reason: `expected loaded=true, got ${String(o.loaded)}` };
            }
            return { ok: true };
        })(),
        (() => {
            if (o.nodeCount !== expectedNodeCount) {
                return {
                    ok: false,
                    reason: `expected nodeCount=${expectedNodeCount}, got ${String(o.nodeCount)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            if (o.edgeCount !== expectedEdgeCount) {
                return {
                    ok: false,
                    reason: `expected edgeCount=${expectedEdgeCount}, got ${String(o.edgeCount)}`,
                };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(512)(output),
    ];
}
