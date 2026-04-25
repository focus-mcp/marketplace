/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'renamed'),
        inv.outputHasField(output, 'from'),
        inv.outputHasField(output, 'to'),
        (() => {
            const renamed = (output as { renamed: unknown }).renamed;
            if (renamed !== true) {
                return {
                    ok: false,
                    reason: `expected renamed=true, got ${JSON.stringify(renamed)}`,
                };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(2048)(output),
    ];
}
