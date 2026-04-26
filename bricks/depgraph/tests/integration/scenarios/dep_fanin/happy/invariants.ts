/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    const o = output as { fanin?: unknown[]; count?: unknown };
    return [
        inv.outputSizeUnder(4096)(output),
        inv.outputHasField(output, 'fanin'),
        inv.outputHasField(output, 'count'),
        (() => {
            if (!Array.isArray(o.fanin) || o.fanin.length === 0) {
                return {
                    ok: false,
                    reason: `expected at least 1 fan-in, got ${String(o.fanin?.length ?? 0)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            if (typeof o.count !== 'number' || o.count < 1) {
                return { ok: false, reason: `expected count >= 1, got ${String(o.count)}` };
            }
            return { ok: true };
        })(),
    ];
}
