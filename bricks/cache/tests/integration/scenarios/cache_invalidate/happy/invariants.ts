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
            if (o.hit !== false) {
                return {
                    ok: false,
                    reason: `expected hit=false after invalidation, got ${String(o.hit)}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { content: unknown };
            if (o.content !== 'original') {
                return {
                    ok: false,
                    reason: `expected content='original' from FS after invalidation, got ${String(o.content)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
