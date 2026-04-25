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
            if (lines.length !== 5) {
                return { ok: false, reason: `expected 5 lines, got ${lines.length}` };
            }
            return { ok: true };
        })(),
        (() => {
            const lines = (output as { lines: string[] }).lines;
            if (!Array.isArray(lines)) return { ok: false, reason: 'not an array' };
            // Last line of sample.ts after split('\n') is '' (empty, after trailing newline)
            const last = lines[lines.length - 1];
            if (last !== '') {
                return {
                    ok: false,
                    reason: `expected last line to be empty string (trailing newline), got: ${JSON.stringify(last)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
