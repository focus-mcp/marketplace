/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'files'),
        (() => {
            const out = output as { files: unknown };
            if (!Array.isArray(out.files)) {
                return { ok: false, reason: 'output.files must be an array' };
            }
            if (out.files.length !== 0) {
                return {
                    ok: false,
                    reason: `expected empty array after reset, got length=${out.files.length}`,
                };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(512)(output),
    ];
}
