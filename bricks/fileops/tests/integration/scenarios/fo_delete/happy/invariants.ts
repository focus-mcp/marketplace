/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'deleted'),
        inv.outputHasField(output, 'path'),
        (() => {
            const deleted = (output as { deleted: unknown }).deleted;
            if (deleted !== true) {
                return {
                    ok: false,
                    reason: `expected deleted=true, got ${JSON.stringify(deleted)}`,
                };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(2048)(output),
    ];
}
