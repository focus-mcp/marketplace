/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    const o = output as { defaultMs?: unknown };
    return [
        inv.outputSizeUnder(2048)(output),
        inv.outputHasField(output, 'defaultMs'),
        (() => {
            if (typeof o.defaultMs !== 'number' || o.defaultMs <= 0) {
                return { ok: false, reason: `expected defaultMs > 0, got ${String(o.defaultMs)}` };
            }
            return { ok: true };
        })(),
    ];
}
