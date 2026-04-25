/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'copied'),
        inv.outputHasField(output, 'from'),
        inv.outputHasField(output, 'to'),
        (() => {
            const copied = (output as { copied: unknown }).copied;
            if (copied !== true) {
                return { ok: false, reason: `expected copied=true, got ${JSON.stringify(copied)}` };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(2048)(output),
    ];
}
