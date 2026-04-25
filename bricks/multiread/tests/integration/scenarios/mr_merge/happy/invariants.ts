/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'content'),
        (() => {
            const out = output as { content: unknown };
            if (typeof out.content !== 'string' || out.content.length === 0) {
                return { ok: false, reason: 'output.content must be a non-empty string' };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as { content: string };
            if (typeof out.content !== 'string') return { ok: true };
            if (!out.content.includes('--- compiler.ts ---')) {
                return {
                    ok: false,
                    reason: 'merged content must include "--- compiler.ts ---" separator',
                };
            }
            return { ok: true };
        })(),
        (() => {
            const out = output as { content: string };
            if (typeof out.content !== 'string') return { ok: true };
            if (!out.content.includes('--- constants.ts ---')) {
                return {
                    ok: false,
                    reason: 'merged content must include "--- constants.ts ---" separator',
                };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(131072)(output),
    ];
}
