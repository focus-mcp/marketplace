/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'filesIndexed'),
        inv.outputHasField(output, 'termsIndexed'),
        inv.outputHasField(output, 'duration'),
        (() => {
            const o = output as { filesIndexed: unknown };
            if (typeof o.filesIndexed !== 'number' || o.filesIndexed <= 0) {
                return { ok: false, reason: `expected filesIndexed > 0, got ${o.filesIndexed}` };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { termsIndexed: unknown };
            if (typeof o.termsIndexed !== 'number' || o.termsIndexed <= 0) {
                return { ok: false, reason: `expected termsIndexed > 0, got ${o.termsIndexed}` };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { duration: unknown };
            if (typeof o.duration !== 'number' || o.duration < 0) {
                return { ok: false, reason: `expected duration >= 0, got ${o.duration}` };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(4096)(output),
    ];
}
