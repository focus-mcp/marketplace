/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'lines'),
        (() => {
            const lines = (output as { lines: unknown }).lines;
            if (!Array.isArray(lines)) {
                return { ok: false, reason: 'output.lines must be an array' };
            }
            if (lines.length !== 10) {
                return { ok: false, reason: `expected 10 lines, got ${lines.length}` };
            }
            return { ok: true };
        })(),
        (() => {
            const lines = (output as { lines: string[] }).lines;
            if (!Array.isArray(lines)) return { ok: false, reason: 'not an array' };
            if (!lines[0]?.includes('SPDX')) {
                return { ok: false, reason: 'first line should be SPDX comment' };
            }
            return { ok: true };
        })(),
    ];
}
