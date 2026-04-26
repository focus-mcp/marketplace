/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    const o = output as { results?: unknown[]; count?: unknown };
    return [
        inv.outputSizeUnder(2048)(output),
        inv.outputHasField(output, 'results'),
        inv.outputHasField(output, 'count'),
        (() => {
            if (o.count !== 1) {
                return { ok: false, reason: `expected count=1, got ${String(o.count)}` };
            }
            return { ok: true };
        })(),
        (() => {
            const first = o.results?.[0] as
                | { id?: unknown; type?: unknown; label?: unknown }
                | undefined;
            if (
                !first ||
                typeof first.id !== 'string' ||
                typeof first.type !== 'string' ||
                typeof first.label !== 'string'
            ) {
                return {
                    ok: false,
                    reason: `result must have id/type/label strings, got ${JSON.stringify(first)}`,
                };
            }
            return { ok: true };
        })(),
    ];
}
