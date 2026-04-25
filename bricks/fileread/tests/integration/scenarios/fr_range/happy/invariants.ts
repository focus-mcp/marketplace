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
            if (lines.length !== 6) {
                return { ok: false, reason: `expected 6 lines (3..8), got ${lines.length}` };
            }
            return { ok: true };
        })(),
        (() => {
            const lines = (output as { lines: string[] }).lines;
            if (!Array.isArray(lines)) return { ok: false, reason: 'not an array' };
            // line 4 (index 1 in result) is "import { Injectable } from '@nestjs/common';"
            if (!lines[1]?.includes('Injectable')) {
                return { ok: false, reason: 'line 4 should contain Injectable import' };
            }
            return { ok: true };
        })(),
    ];
}
