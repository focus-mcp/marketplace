/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'replacements'),
        inv.outputHasField(output, 'path'),
        (() => {
            const replacements = (output as { replacements: unknown }).replacements;
            if (typeof replacements !== 'number') {
                return { ok: false, reason: 'output.replacements must be a number' };
            }
            if (replacements < 1) {
                return {
                    ok: false,
                    reason: `expected at least 1 replacement, got ${replacements}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
