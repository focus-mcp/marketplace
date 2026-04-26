/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    const o = output as {
        nodes?: Array<{ type?: unknown }>;
        edges?: unknown[];
        nodeCount?: unknown;
        edgeCount?: unknown;
    };
    return [
        inv.outputSizeUnder(2048)(output),
        inv.outputHasField(output, 'nodes'),
        inv.outputHasField(output, 'nodeCount'),
        (() => {
            if (o.nodeCount !== 2) {
                return { ok: false, reason: `expected nodeCount=2, got ${String(o.nodeCount)}` };
            }
            return { ok: true };
        })(),
        (() => {
            if (!Array.isArray(o.nodes) || !o.nodes.every((n) => n.type === 'concept')) {
                return { ok: false, reason: `all nodes must have type='concept'` };
            }
            return { ok: true };
        })(),
    ];
}
