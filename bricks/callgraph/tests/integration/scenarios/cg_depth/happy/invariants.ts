/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    const o = output as { depth?: unknown };
    return [
        inv.outputSizeUnder(2048)(output),
        inv.outputHasField(output, 'depth'),
        (() => {
            if (typeof o.depth !== 'number' || o.depth < 2) {
                return { ok: false, reason: `expected depth >= 2, got ${String(o.depth)}` };
            }
            return { ok: true };
        })(),
    ];
}
