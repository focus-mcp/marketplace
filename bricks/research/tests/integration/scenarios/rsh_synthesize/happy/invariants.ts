/*
 * SPDX-FileCopyrightText: 2026 FocusMCP contributors
 * SPDX-License-Identifier: MIT
 */
import type { InvariantResult } from '@focus-mcp/marketplace-testing';
import { invariants as inv } from '@focus-mcp/marketplace-testing';

export function check(output: unknown): InvariantResult[] {
    return [
        inv.outputHasField(output, 'sharedTypes'),
        inv.outputHasField(output, 'commonDeps'),
        inv.outputHasField(output, 'apiSurface'),
        inv.outputHasField(output, 'connections'),
        inv.outputSizeUnder(8192)(output),
        (() => {
            const o = output as {
                sharedTypes: unknown;
                commonDeps: unknown;
                apiSurface: unknown;
                connections: unknown;
            };
            for (const [field, val] of [
                ['sharedTypes', o.sharedTypes],
                ['commonDeps', o.commonDeps],
                ['apiSurface', o.apiSurface],
                ['connections', o.connections],
            ] as const) {
                if (!Array.isArray(val)) {
                    return {
                        ok: false,
                        reason: `expected ${field} to be an array, got ${typeof val}`,
                    };
                }
            }
            return { ok: true };
        })(),
    ];
}
