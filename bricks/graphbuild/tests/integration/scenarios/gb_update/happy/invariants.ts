/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown, nodeCountBefore: number): InvariantResult[] {
    const o = output as { updated?: unknown; nodeCount?: unknown; edgeCount?: unknown };
    return [
        inv.outputHasField(output, 'updated'),
        inv.outputHasField(output, 'nodeCount'),
        inv.outputHasField(output, 'edgeCount'),
        (() => {
            if (o.updated !== 1) {
                return {
                    ok: false,
                    reason: `expected updated=1, got ${String(o.updated)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            if (typeof o.nodeCount !== 'number' || o.nodeCount < nodeCountBefore) {
                return {
                    ok: false,
                    reason: `expected nodeCount >= ${nodeCountBefore} (increased after update), got ${String(o.nodeCount)}`,
                };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(4096)(output),
    ];
}
