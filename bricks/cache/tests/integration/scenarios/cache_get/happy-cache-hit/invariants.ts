/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'hit'),
        inv.outputHasField(output, 'content'),
        (() => {
            const o = output as { hit: unknown };
            if (o.hit !== true) {
                return {
                    ok: false,
                    reason: `expected hit=true for cached content, got ${String(o.hit)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { content: unknown };
            if (typeof o.content !== 'string') {
                return {
                    ok: false,
                    reason: `expected content to be a string, got ${typeof o.content}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
