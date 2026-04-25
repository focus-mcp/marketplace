/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'moved'),
        inv.outputHasField(output, 'from'),
        inv.outputHasField(output, 'to'),
        (() => {
            const moved = (output as { moved: unknown }).moved;
            if (moved !== true) {
                return { ok: false, reason: `expected moved=true, got ${JSON.stringify(moved)}` };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(2048)(output),
    ];
}
