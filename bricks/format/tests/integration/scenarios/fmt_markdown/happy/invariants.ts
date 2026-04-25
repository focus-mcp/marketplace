/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'markdown'),
        (() => {
            const out = output as { markdown: unknown };
            if (typeof out.markdown !== 'string') {
                return { ok: false, reason: 'output.markdown must be a string' };
            }
            if (out.markdown.trim().length === 0) {
                return { ok: false, reason: 'output.markdown must not be empty' };
            }
            if (!out.markdown.includes('name')) {
                return {
                    ok: false,
                    reason: `expected "name" key in markdown output, got: "${out.markdown}"`,
                };
            }
            if (!out.markdown.includes('Alice')) {
                return {
                    ok: false,
                    reason: `expected "Alice" value in markdown output, got: "${out.markdown}"`,
                };
            }
            return { ok: true };
        })(),
        inv.outputSizeUnder(4096)(output),
    ];
}
