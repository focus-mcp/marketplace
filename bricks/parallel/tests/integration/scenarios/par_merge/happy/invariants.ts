/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    const o = output as { merged?: unknown; lineCount?: unknown };
    return [
        inv.outputSizeUnder(2048)(output),
        inv.outputHasField(output, 'merged'),
        inv.outputHasField(output, 'lineCount'),
        (() => {
            if (typeof o.merged !== 'string' || o.merged.length === 0) {
                return {
                    ok: false,
                    reason: `expected merged to be non-empty string, got ${String(o.merged)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            if (typeof o.lineCount !== 'number' || o.lineCount < 1) {
                return { ok: false, reason: `expected lineCount >= 1, got ${String(o.lineCount)}` };
            }
            return { ok: true };
        })(),
    ];
}
