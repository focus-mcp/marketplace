/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'written'),
        inv.outputHasField(output, 'path'),
        (() => {
            const written = (output as { written: unknown }).written;
            if (written !== true) {
                return {
                    ok: false,
                    reason: `expected written=true, got ${JSON.stringify(written)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
