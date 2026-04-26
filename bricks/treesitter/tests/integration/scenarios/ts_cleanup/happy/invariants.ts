/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    const o = output as { removed?: unknown };
    return [
        inv.outputSizeUnder(1024)(output),
        inv.outputHasField(output, 'removed'),
        (() => {
            if (typeof o.removed !== 'number' || o.removed < 1) {
                return { ok: false, reason: `expected removed >= 1, got ${String(o.removed)}` };
            }
            return { ok: true };
        })(),
    ];
}
