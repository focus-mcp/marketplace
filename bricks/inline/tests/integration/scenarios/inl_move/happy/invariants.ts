/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'moved'),
        inv.outputHasField(output, 'sourceUpdated'),
        inv.outputHasField(output, 'targetUpdated'),
        inv.outputHasField(output, 'preview'),
        (() => {
            const o = output as { moved: unknown };
            if (o.moved !== true) {
                return { ok: false, reason: `expected moved === true, got ${o.moved}` };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { sourceUpdated: unknown };
            if (o.sourceUpdated !== true) {
                return {
                    ok: false,
                    reason: `expected sourceUpdated === true, got ${o.sourceUpdated}`,
                };
            }
            return { ok: true };
        })(),
        (() => {
            const o = output as { targetUpdated: unknown };
            if (o.targetUpdated !== true) {
                return {
                    ok: false,
                    reason: `expected targetUpdated === true, got ${o.targetUpdated}`,
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
