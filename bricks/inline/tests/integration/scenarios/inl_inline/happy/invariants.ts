/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'inlined'),
        inv.outputHasField(output, 'usagesReplaced'),
        inv.outputHasField(output, 'definitionRemoved'),
        inv.outputHasField(output, 'preview'),
        (() => {
            const o = output as { inlined: unknown };
            if (o.inlined !== true) {
                return { ok: false, reason: `expected inlined === true, got ${o.inlined}` };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { usagesReplaced: unknown };
            if (typeof o.usagesReplaced !== 'number' || o.usagesReplaced < 1) {
                return {
                    ok: false,
                    reason: `expected usagesReplaced >= 1, got ${o.usagesReplaced}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { definitionRemoved: unknown };
            if (o.definitionRemoved !== true) {
                return {
                    ok: false,
                    reason: `expected definitionRemoved === true, got ${o.definitionRemoved}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { preview: unknown };
            if (typeof o.preview !== 'string' || o.preview.length === 0) {
                return { ok: false, reason: 'expected non-empty preview string' };
            }
            return { ok: true };
        })(),
    ];
}
