/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown, expectedFile: string): InvariantResult[] {
    return [
        inv.outputHasField(output, 'file'),
        inv.outputHasField(output, 'totalAccesses'),
        (() => {
            const out = output as { file: unknown; totalAccesses: unknown };
            if (typeof out.file !== 'string') {
                return { ok: false, reason: 'output.file must be a string' };
            }
            if (out.file !== expectedFile) {
                return {
                    ok: false,
                    reason: `expected file="${expectedFile}", got "${out.file}"`,
                };
            }
            if (typeof out.totalAccesses !== 'number' || out.totalAccesses < 1) {
                return { ok: false, reason: 'output.totalAccesses must be >= 1' };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(1024)(output),
    ];
}
