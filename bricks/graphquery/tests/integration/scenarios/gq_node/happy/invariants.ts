/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    const o = output as {
        node?: { id?: unknown; type?: unknown; label?: unknown };
        inEdges?: unknown[];
        outEdges?: unknown[];
    };
    return [
        inv.outputSizeUnder(2048)(output),
        inv.outputHasField(output, 'node'),
        inv.outputHasField(output, 'inEdges'),
        inv.outputHasField(output, 'outEdges'),
        (() => {
            if (o.node?.id !== 'a') {
                return { ok: false, reason: `expected node.id='a', got ${String(o.node?.id)}` };
            }
            return { ok: true };
        })(),
        (() => {
            if (!Array.isArray(o.outEdges) || o.outEdges.length < 1) {
                return {
                    ok: false,
                    reason: `expected at least 1 outEdge, got ${String(o.outEdges?.length)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
