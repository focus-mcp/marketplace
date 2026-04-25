/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'tokens'),
        inv.outputHasField(output, 'chars'),
        inv.outputHasField(output, 'lines'),
        (() => {
            const out = output as { tokens: unknown; chars: unknown; lines: unknown };
            if (typeof out.tokens !== 'number' || out.tokens <= 0) {
                return { ok: false, reason: 'output.tokens must be > 0' };
            }
            if (typeof out.chars !== 'number' || out.chars <= 0) {
                return { ok: false, reason: 'output.chars must be > 0' };
            }
            if (typeof out.lines !== 'number' || out.lines < 1) {
                return { ok: false, reason: 'output.lines must be >= 1' };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(1024)(output),
    ];
}
