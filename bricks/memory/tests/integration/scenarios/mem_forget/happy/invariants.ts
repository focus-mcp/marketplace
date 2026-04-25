/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(forgetOutput: unknown, recallOutput: unknown): InvariantResult[] {
    return [
        inv.outputHasField(forgetOutput, 'deleted'),
        inv.outputHasField(recallOutput, 'value'),
        (() => {
            const o = forgetOutput as { deleted: unknown };
            if (o.deleted !== true) {
                return { ok: false, reason: `expected deleted=true, got ${String(o.deleted)}` };
            }
            return { ok: true };
        })(),
        (() => {
            const o = recallOutput as { value: unknown };
            if (o.value !== null) {
                return {
                    ok: false,
                    reason: `expected value=null after forget, got ${String(o.value)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
