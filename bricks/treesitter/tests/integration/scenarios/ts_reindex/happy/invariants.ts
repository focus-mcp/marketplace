/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    const o = output as { symbols?: unknown };
    return [
        inv.outputSizeUnder(2048)(output),
        inv.outputHasField(output, 'symbols'),
        (() => {
            if (typeof o.symbols !== 'number' || o.symbols < 1) {
                return { ok: false, reason: `expected symbols >= 1, got ${String(o.symbols)}` };
            }
            return { ok: true };
        })(),
    ];
}
