/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'extracted'),
        inv.outputHasField(output, 'preview'),
        (() => {
            const o = output as { extracted: unknown };
            if (o.extracted !== false) {
                return {
                    ok: false,
                    reason: `expected extracted === false for invalid range, got ${o.extracted}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { preview: unknown };
            if (typeof o.preview !== 'string' || o.preview.length === 0) {
                return {
                    ok: false,
                    reason: 'expected a non-empty error message in preview for invalid range',
                };
            }
            return { ok: true };
        })(),
    ];
}
