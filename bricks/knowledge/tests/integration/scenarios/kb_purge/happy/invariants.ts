/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(
    purgeOutput: unknown,
    expectedPurged: number,
    expectedRemaining: number,
): InvariantResult[] {
    return [
        inv.outputHasField(purgeOutput, 'purged'),
        inv.outputHasField(purgeOutput, 'remaining'),
        (() => {
            const o = purgeOutput as { purged: unknown };
            if (o.purged !== expectedPurged) {
                return {
                    ok: false,
                    reason: `expected purged=${expectedPurged}, got ${String(o.purged)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = purgeOutput as { remaining: unknown };
            if (o.remaining !== expectedRemaining) {
                return {
                    ok: false,
                    reason: `expected remaining=${expectedRemaining}, got ${String(o.remaining)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
