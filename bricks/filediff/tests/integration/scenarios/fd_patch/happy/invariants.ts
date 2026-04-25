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
            const content = (output as { content: unknown }).content;
            if (typeof content !== 'string') {
                return { ok: false, reason: 'output.content must be a string' };
            }
            if (!content.includes('Hello FocusMCP')) {
                return {
                    ok: false,
                    reason: `expected patched content to contain "Hello FocusMCP", got: ${content.slice(0, 100)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
