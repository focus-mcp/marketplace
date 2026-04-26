/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    const o = output as { cycles?: unknown[] };
    return [
        inv.outputSizeUnder(4096)(output),
        inv.outputHasField(output, 'cycles'),
        (() => {
            if (!Array.isArray(o.cycles) || o.cycles.length === 0) {
                return {
                    ok: false,
                    reason: `expected at least 1 cycle, got ${String(o.cycles?.length ?? 0)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
