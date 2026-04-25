/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown, expectedFile: string): InvariantResult[] {
    return [
        inv.outputHasField(output, 'files'),
        inv.outputHasField(output, 'count'),
        (() => {
            const out = output as { files: unknown; count: unknown };
            if (!Array.isArray(out.files)) {
                return { ok: false, reason: 'output.files must be an array' };
            }
            if (typeof out.count !== 'number') {
                return { ok: false, reason: 'output.count must be a number' };
            }
            if (out.count !== out.files.length) {
                return {
                    ok: false,
                    reason: `output.count=${out.count} must equal files.length=${out.files.length}`,
                };
            }
            if (out.files.length === 0) {
                return {
                    ok: false,
                    reason: 'expected at least 1 cold file (threshold=0 makes all files cold)',
                };
            }
            if (!out.files.includes(expectedFile)) {
                return {
                    ok: false,
                    reason: `expected "${expectedFile}" in cold files`,
                };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(4096)(output),
    ];
}
