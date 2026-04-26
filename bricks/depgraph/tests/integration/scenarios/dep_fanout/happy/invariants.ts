/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown, expectedFanout: number): InvariantResult[] {
    const o = output as { fanout?: unknown; imports?: unknown[] };
    return [
        inv.outputSizeUnder(4096)(output),
        inv.outputHasField(output, 'fanout'),
        inv.outputHasField(output, 'imports'),
        (() => {
            if (o.fanout !== expectedFanout) {
                return {
                    ok: false,
                    reason: `expected fanout=${expectedFanout}, got ${String(o.fanout)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            if (!Array.isArray(o.imports) || o.imports.length !== expectedFanout) {
                return {
                    ok: false,
                    reason: `expected ${expectedFanout} imports, got ${String(o.imports?.length)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
