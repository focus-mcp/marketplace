/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    const o = output as { format?: unknown; nodes?: unknown; edges?: unknown };
    return [
        inv.outputHasField(output, 'format'),
        inv.outputHasField(output, 'nodes'),
        inv.outputHasField(output, 'edges'),
        (() => {
            if (o.format !== 'full') {
                return {
                    ok: false,
                    reason: `expected format='full', got ${String(o.format)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            if (!Array.isArray(o.nodes) || o.nodes.length === 0) {
                return {
                    ok: false,
                    reason: `expected nodes to be a non-empty array, got ${JSON.stringify(o.nodes)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            if (!Array.isArray(o.edges)) {
                return {
                    ok: false,
                    reason: `expected edges to be an array, got ${JSON.stringify(o.edges)}`,
                };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(16384)(output),
    ];
}
