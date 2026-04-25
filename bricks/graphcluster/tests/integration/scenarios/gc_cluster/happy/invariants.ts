/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    const o = output as { clusters?: unknown; totalClusters?: unknown };
    return [
        inv.outputHasField(output, 'clusters'),
        inv.outputHasField(output, 'totalClusters'),
        (() => {
            if (!Array.isArray(o.clusters) || o.clusters.length === 0) {
                return {
                    ok: false,
                    reason: `expected clusters to be a non-empty array, got ${JSON.stringify(o.clusters)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            if (typeof o.totalClusters !== 'number' || o.totalClusters === 0) {
                return {
                    ok: false,
                    reason: `expected totalClusters > 0, got ${String(o.totalClusters)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const clusters = o.clusters as unknown[];
            const first = clusters[0] as { id?: unknown; members?: unknown; size?: unknown };
            if (typeof first.id !== 'number') {
                return { ok: false, reason: `expected cluster.id to be a number` };
            }
            if (!Array.isArray(first.members)) {
                return { ok: false, reason: `expected cluster.members to be an array` };
            }
            if (typeof first.size !== 'number') {
                return { ok: false, reason: `expected cluster.size to be a number` };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(8192)(output),
    ];
}
