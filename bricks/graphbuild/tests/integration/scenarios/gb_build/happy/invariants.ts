/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown, expectedFiles: number): InvariantResult[] {
    const o = output as { nodeCount?: unknown; edgeCount?: unknown; files?: unknown };
    return [
        inv.outputHasField(output, 'nodeCount'),
        inv.outputHasField(output, 'edgeCount'),
        inv.outputHasField(output, 'files'),
        (() => {
            if (typeof o.nodeCount !== 'number' || o.nodeCount === 0) {
                return {
                    ok: false,
                    reason: `expected nodeCount > 0, got ${String(o.nodeCount)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            if (typeof o.edgeCount !== 'number' || o.edgeCount < 0) {
                return {
                    ok: false,
                    reason: `expected edgeCount >= 0, got ${String(o.edgeCount)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            if (o.files !== expectedFiles) {
                return {
                    ok: false,
                    reason: `expected files=${expectedFiles}, got ${String(o.files)}`,
                };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(4096)(output),
    ];
}
