/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(warmupOutput: unknown, statsOutput: unknown): InvariantResult[] {
    return [
        inv.outputHasField(warmupOutput, 'loaded'),
        inv.outputHasField(warmupOutput, 'failed'),
        inv.outputHasField(statsOutput, 'entries'),
        (() => {
            const o = warmupOutput as { loaded: unknown };
            if (o.loaded !== 3) {
                return { ok: false, reason: `expected loaded=3, got ${String(o.loaded)}` };
            }
            return { ok: true };
        })(),
        (() => {
            const o = warmupOutput as { failed: unknown };
            if (o.failed !== 0) {
                return { ok: false, reason: `expected failed=0, got ${String(o.failed)}` };
            }
            return { ok: true };
        })(),
        (() => {
            const o = statsOutput as { entries: unknown };
            if (o.entries !== 3) {
                return {
                    ok: false,
                    reason: `expected entries=3 in cache after warmup, got ${String(o.entries)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
