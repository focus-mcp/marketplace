/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'replacements'),
        (() => {
            const replacements = (output as { replacements: unknown }).replacements;
            if (typeof replacements !== 'number') {
                return { ok: false, reason: 'output.replacements must be a number' };
            }
            if (replacements !== 0) {
                return {
                    ok: false,
                    reason: `expected 0 replacements for nonexistent pattern, got ${replacements}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
